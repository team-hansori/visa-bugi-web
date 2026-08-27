from pathlib import Path

from docx import Document
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Mm, Pt, RGBColor


FONT_NAME = "휴먼명조"
TABLE_WIDTH_DXA = 10080
TABLE_INDENT_DXA = 120
BLACK = "000000"
WHITE = "FFFFFF"
GRAY = "666666"


def set_run_font(run, size=11, bold=False, color=BLACK, italic=False):
    run.font.name = FONT_NAME
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor.from_string(color)
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.get_or_add_rFonts()
    for attr in ("ascii", "hAnsi", "eastAsia", "cs"):
        rfonts.set(qn(f"w:{attr}"), FONT_NAME)


def set_paragraph_format(
    paragraph,
    *,
    alignment=WD_ALIGN_PARAGRAPH.JUSTIFY,
    before=0,
    after=6,
    line_spacing=1.6,
    keep_with_next=False,
    keep_together=False,
):
    paragraph.alignment = alignment
    paragraph.paragraph_format.space_before = Pt(before)
    paragraph.paragraph_format.space_after = Pt(after)
    paragraph.paragraph_format.line_spacing = line_spacing
    paragraph.paragraph_format.keep_with_next = keep_with_next
    paragraph.paragraph_format.keep_together = keep_together


def set_cell_margins(cell, top=90, start=120, bottom=90, end=120):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for side, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{side}"))
        if node is None:
            node = OxmlElement(f"w:{side}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_cell_fill(cell, color=WHITE):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), color)
    shd.set(qn("w:val"), "clear")


def set_cell_border(cell, *, size=8, color=BLACK):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge_name in ("top", "bottom", "start", "end", "insideH", "insideV"):
        tag = qn(f"w:{edge_name}")
        edge = borders.find(tag)
        if edge is None:
            edge = OxmlElement(f"w:{edge_name}")
            borders.append(edge)
        edge.set(qn("w:val"), "single")
        edge.set(qn("w:sz"), str(size))
        edge.set(qn("w:space"), "0")
        edge.set(qn("w:color"), color)


def remove_cell_border(cell):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge_name in ("top", "bottom", "start", "end", "insideH", "insideV"):
        edge = OxmlElement(f"w:{edge_name}")
        edge.set(qn("w:val"), "nil")
        borders.append(edge)


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    header = OxmlElement("w:tblHeader")
    header.set(qn("w:val"), "true")
    tr_pr.append(header)


def prevent_row_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    if tr_pr.find(qn("w:cantSplit")) is None:
        tr_pr.append(OxmlElement("w:cantSplit"))


def apply_table_geometry(table, widths, indent=TABLE_INDENT_DXA):
    table.autofit = False
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    tbl_pr = table._tbl.tblPr
    layout = tbl_pr.find(qn("w:tblLayout"))
    if layout is None:
        layout = OxmlElement("w:tblLayout")
        tbl_pr.append(layout)
    layout.set(qn("w:type"), "fixed")
    tbl_w = tbl_pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:w"), str(sum(widths)))
    tbl_w.set(qn("w:type"), "dxa")
    tbl_ind = tbl_pr.find(qn("w:tblInd"))
    if tbl_ind is None:
        tbl_ind = OxmlElement("w:tblInd")
        tbl_pr.append(tbl_ind)
    tbl_ind.set(qn("w:w"), str(indent))
    tbl_ind.set(qn("w:type"), "dxa")

    grid = table._tbl.tblGrid
    for child in list(grid):
        grid.remove(child)
    for width in widths:
        col = OxmlElement("w:gridCol")
        col.set(qn("w:w"), str(width))
        grid.append(col)

    for tr in table._tbl.tr_lst:
        col_index = 0
        for tc in tr.tc_lst:
            tc_pr = tc.get_or_add_tcPr()
            span_node = tc_pr.find(qn("w:gridSpan"))
            span = int(span_node.get(qn("w:val"))) if span_node is not None else 1
            width = sum(widths[col_index : col_index + span])
            tc_w = tc_pr.find(qn("w:tcW"))
            if tc_w is None:
                tc_w = OxmlElement("w:tcW")
                tc_pr.append(tc_w)
            tc_w.set(qn("w:w"), str(width))
            tc_w.set(qn("w:type"), "dxa")
            col_index += span


def set_cell_text(
    cell,
    text,
    *,
    size=9.5,
    bold=False,
    color=BLACK,
    alignment=WD_ALIGN_PARAGRAPH.LEFT,
    line_spacing=1.35,
):
    cell.text = ""
    paragraph = cell.paragraphs[0]
    set_paragraph_format(
        paragraph,
        alignment=alignment,
        before=0,
        after=0,
        line_spacing=line_spacing,
        keep_together=True,
    )
    lines = str(text).split("\n")
    for index, line in enumerate(lines):
        if index:
            paragraph.add_run().add_break()
        run = paragraph.add_run(line)
        set_run_font(run, size=size, bold=bold, color=color)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER


def style_name(document, name, *, size, bold, before, after, line_spacing, alignment, color=BLACK):
    style = document.styles[name]
    style.font.name = FONT_NAME
    style.font.size = Pt(size)
    style.font.bold = bold
    style.font.color.rgb = RGBColor.from_string(color)
    style._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), FONT_NAME)
    for attr in ("ascii", "hAnsi", "cs"):
        style._element.rPr.rFonts.set(qn(f"w:{attr}"), FONT_NAME)
    style.paragraph_format.space_before = Pt(before)
    style.paragraph_format.space_after = Pt(after)
    style.paragraph_format.line_spacing = line_spacing
    style.paragraph_format.alignment = alignment
    style.paragraph_format.keep_with_next = True


def configure_document(document):
    section = document.sections[0]
    section.page_width = Mm(210)
    section.page_height = Mm(297)
    section.top_margin = Mm(15)
    section.bottom_margin = Mm(15)
    section.left_margin = Mm(15)
    section.right_margin = Mm(15)
    section.header_distance = Mm(8)
    section.footer_distance = Mm(8)

    style_name(
        document,
        "Normal",
        size=11,
        bold=False,
        before=0,
        after=6,
        line_spacing=1.6,
        alignment=WD_ALIGN_PARAGRAPH.JUSTIFY,
    )
    style_name(
        document,
        "Heading 1",
        size=16,
        bold=True,
        before=0,
        after=8,
        line_spacing=1.2,
        alignment=WD_ALIGN_PARAGRAPH.LEFT,
    )
    style_name(
        document,
        "Heading 2",
        size=13,
        bold=True,
        before=8,
        after=5,
        line_spacing=1.2,
        alignment=WD_ALIGN_PARAGRAPH.LEFT,
    )
    style_name(
        document,
        "Heading 3",
        size=11.5,
        bold=True,
        before=6,
        after=3,
        line_spacing=1.2,
        alignment=WD_ALIGN_PARAGRAPH.LEFT,
    )
    style_name(
        document,
        "Caption",
        size=9,
        bold=False,
        before=3,
        after=6,
        line_spacing=1.2,
        alignment=WD_ALIGN_PARAGRAPH.CENTER,
    )

    for style_name_value in ("List Bullet", "List Number"):
        style = document.styles[style_name_value]
        style.font.name = FONT_NAME
        style.font.size = Pt(10.5)
        style._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), FONT_NAME)
        style.paragraph_format.left_indent = Mm(8.5)
        style.paragraph_format.first_line_indent = Mm(-4.2)
        style.paragraph_format.space_after = Pt(3)
        style.paragraph_format.line_spacing = 1.45

    set_header_footer(section)


def set_header_footer(section):
    header = section.header
    p = header.paragraphs[0]
    set_paragraph_format(
        p,
        alignment=WD_ALIGN_PARAGRAPH.RIGHT,
        before=0,
        after=0,
        line_spacing=1.0,
    )
    run = p.add_run("제13회 전국 ICT융합 공모전  |  비자부기")
    set_run_font(run, size=8.5, color=GRAY)

    footer = section.footer
    p = footer.paragraphs[0]
    set_paragraph_format(
        p,
        alignment=WD_ALIGN_PARAGRAPH.CENTER,
        before=0,
        after=0,
        line_spacing=1.0,
    )
    run = p.add_run("비자부기 사업계획서  |  ")
    set_run_font(run, size=8.5, color=GRAY)
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), "PAGE")
    fld_run = OxmlElement("w:r")
    fld_rpr = OxmlElement("w:rPr")
    fld_fonts = OxmlElement("w:rFonts")
    for attr in ("ascii", "hAnsi", "eastAsia", "cs"):
        fld_fonts.set(qn(f"w:{attr}"), FONT_NAME)
    fld_rpr.append(fld_fonts)
    fld_run.append(fld_rpr)
    text = OxmlElement("w:t")
    text.text = "1"
    fld_run.append(text)
    fld.append(fld_run)
    p._p.append(fld)


def add_body(document, text, *, bold_lead=None, after=6, size=11, italic=False):
    paragraph = document.add_paragraph()
    set_paragraph_format(paragraph, after=after, line_spacing=1.6)
    if bold_lead and text.startswith(bold_lead):
        lead = paragraph.add_run(bold_lead)
        set_run_font(lead, size=size, bold=True)
        rest = paragraph.add_run(text[len(bold_lead) :])
        set_run_font(rest, size=size, italic=italic)
    else:
        run = paragraph.add_run(text)
        set_run_font(run, size=size, italic=italic)
    return paragraph


def add_bullet(document, text, *, size=10.5):
    paragraph = document.add_paragraph(style="List Bullet")
    paragraph.paragraph_format.keep_together = True
    run = paragraph.add_run(text)
    set_run_font(run, size=size)
    return paragraph


def add_numbered(document, text, *, size=10.5):
    paragraph = document.add_paragraph(style="List Number")
    paragraph.paragraph_format.keep_together = True
    run = paragraph.add_run(text)
    set_run_font(run, size=size)
    return paragraph


def add_caption(document, text):
    paragraph = document.add_paragraph(style="Caption")
    paragraph.paragraph_format.keep_with_next = False
    run = paragraph.add_run(text)
    set_run_font(run, size=9)
    return paragraph


def add_note_box(document, label, text):
    table = document.add_table(rows=1, cols=1)
    set_repeat_table_header(table.rows[0])
    cell = table.cell(0, 0)
    set_cell_margins(cell, top=130, start=180, bottom=130, end=180)
    set_cell_fill(cell, WHITE)
    set_cell_border(cell, size=12)
    cell.text = ""
    p = cell.paragraphs[0]
    set_paragraph_format(p, alignment=WD_ALIGN_PARAGRAPH.LEFT, after=0, line_spacing=1.45)
    lead = p.add_run(f"{label}  ")
    set_run_font(lead, size=10, bold=True)
    run = p.add_run(text)
    set_run_font(run, size=10)
    apply_table_geometry(table, [TABLE_WIDTH_DXA])
    document.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


def add_standard_table(
    document,
    headers,
    rows,
    widths,
    *,
    font_size=9.2,
    first_col_bold=False,
    center_columns=None,
):
    if center_columns is None:
        center_columns = set()
    table = document.add_table(rows=1 + len(rows), cols=len(headers))
    for c, header in enumerate(headers):
        cell = table.cell(0, c)
        set_cell_fill(cell, BLACK)
        set_cell_border(cell, size=8)
        set_cell_margins(cell, top=100, start=100, bottom=100, end=100)
        set_cell_text(
            cell,
            header,
            size=font_size,
            bold=True,
            color=WHITE,
            alignment=WD_ALIGN_PARAGRAPH.CENTER,
            line_spacing=1.25,
        )
    set_repeat_table_header(table.rows[0])
    for r, values in enumerate(rows, start=1):
        for c, value in enumerate(values):
            cell = table.cell(r, c)
            set_cell_fill(cell, WHITE)
            set_cell_border(cell, size=8)
            set_cell_margins(cell, top=100, start=110, bottom=100, end=110)
            alignment = WD_ALIGN_PARAGRAPH.CENTER if c in center_columns else WD_ALIGN_PARAGRAPH.LEFT
            set_cell_text(
                cell,
                value,
                size=font_size,
                bold=first_col_bold and c == 0,
                alignment=alignment,
                line_spacing=1.35,
            )
    for row in table.rows:
        prevent_row_split(row)
    apply_table_geometry(table, widths)
    document.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


def add_metric_strip(document, items):
    count = len(items)
    widths = [TABLE_WIDTH_DXA // count] * count
    widths[-1] += TABLE_WIDTH_DXA - sum(widths)
    table = document.add_table(rows=2, cols=count)
    set_repeat_table_header(table.rows[0])
    for index, (value, label) in enumerate(items):
        top = table.cell(0, index)
        bottom = table.cell(1, index)
        for cell in (top, bottom):
            set_cell_fill(cell, WHITE)
            set_cell_border(cell, size=10)
            set_cell_margins(cell, top=90, start=80, bottom=90, end=80)
        set_cell_text(
            top,
            value,
            size=14,
            bold=True,
            alignment=WD_ALIGN_PARAGRAPH.CENTER,
            line_spacing=1.1,
        )
        set_cell_text(
            bottom,
            label,
            size=8.8,
            alignment=WD_ALIGN_PARAGRAPH.CENTER,
            line_spacing=1.25,
        )
    for row in table.rows:
        prevent_row_split(row)
    apply_table_geometry(table, widths)
    document.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


def add_compact_flow(document, steps, footer=None):
    count = len(steps)
    if count == 5:
        box_width, arrow_width = 1776, 300
    elif count == 4:
        box_width, arrow_width = 2250, 360
    elif count == 3:
        box_width, arrow_width = 3060, 450
    else:
        raise ValueError("compact flow supports 3 to 5 steps")
    widths = []
    for index in range(count):
        widths.append(box_width)
        if index < count - 1:
            widths.append(arrow_width)
    assert sum(widths) == TABLE_WIDTH_DXA

    table = document.add_table(rows=2, cols=len(widths))
    set_repeat_table_header(table.rows[0])
    for step_index, (heading, body) in enumerate(steps):
        col = step_index * 2
        header_cell = table.cell(0, col)
        body_cell = table.cell(1, col)
        set_cell_fill(header_cell, BLACK)
        set_cell_fill(body_cell, WHITE)
        set_cell_border(header_cell, size=10)
        set_cell_border(body_cell, size=10)
        set_cell_margins(header_cell, top=100, start=70, bottom=100, end=70)
        set_cell_margins(body_cell, top=130, start=70, bottom=130, end=70)
        set_cell_text(
            header_cell,
            heading,
            size=9.2,
            bold=True,
            color=WHITE,
            alignment=WD_ALIGN_PARAGRAPH.CENTER,
            line_spacing=1.25,
        )
        set_cell_text(
            body_cell,
            body,
            size=8.8,
            alignment=WD_ALIGN_PARAGRAPH.CENTER,
            line_spacing=1.3,
        )
        if step_index < count - 1:
            arrow_cell = table.cell(0, col + 1).merge(table.cell(1, col + 1))
            set_cell_fill(arrow_cell, WHITE)
            remove_cell_border(arrow_cell)
            set_cell_margins(arrow_cell, top=0, start=0, bottom=0, end=0)
            set_cell_text(
                arrow_cell,
                "→",
                size=15,
                bold=True,
                alignment=WD_ALIGN_PARAGRAPH.CENTER,
                line_spacing=1.0,
            )
    for row in table.rows:
        prevent_row_split(row)
    apply_table_geometry(table, widths)

    if footer:
        p = document.add_paragraph()
        set_paragraph_format(
            p,
            alignment=WD_ALIGN_PARAGRAPH.CENTER,
            before=4,
            after=4,
            line_spacing=1.25,
        )
        run = p.add_run(footer)
        set_run_font(run, size=9, bold=True)
    return table


def add_picture(document, path, *, width_mm, alt_text, caption):
    p = document.add_paragraph()
    set_paragraph_format(
        p,
        alignment=WD_ALIGN_PARAGRAPH.CENTER,
        before=2,
        after=0,
        line_spacing=1.0,
        keep_with_next=True,
    )
    run = p.add_run()
    shape = run.add_picture(str(path), width=Mm(width_mm))
    shape._inline.docPr.set("descr", alt_text)
    add_caption(document, caption)


def add_hyperlink(paragraph, text, url):
    part = paragraph.part
    rel_id = part.relate_to(
        url,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
        is_external=True,
    )
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), rel_id)
    run = OxmlElement("w:r")
    rpr = OxmlElement("w:rPr")
    rfonts = OxmlElement("w:rFonts")
    for attr in ("ascii", "hAnsi", "eastAsia", "cs"):
        rfonts.set(qn(f"w:{attr}"), FONT_NAME)
    color = OxmlElement("w:color")
    color.set(qn("w:val"), BLACK)
    underline = OxmlElement("w:u")
    underline.set(qn("w:val"), "single")
    size = OxmlElement("w:sz")
    size.set(qn("w:val"), "18")
    rpr.extend([rfonts, color, underline, size])
    run.append(rpr)
    text_node = OxmlElement("w:t")
    text_node.text = text
    run.append(text_node)
    hyperlink.append(run)
    paragraph._p.append(hyperlink)


def add_source(document, number, title, organization, date_text, url):
    paragraph = document.add_paragraph()
    set_paragraph_format(
        paragraph,
        alignment=WD_ALIGN_PARAGRAPH.LEFT,
        before=0,
        after=4,
        line_spacing=1.3,
        keep_together=True,
    )
    lead = paragraph.add_run(f"[{number}] {organization}, ")
    set_run_font(lead, size=9, bold=True)
    title_run = paragraph.add_run(f"「{title}」, {date_text}. ")
    set_run_font(title_run, size=9)
    add_hyperlink(paragraph, "원문 보기", url)


def add_title_block(document):
    p = document.add_paragraph()
    set_paragraph_format(
        p,
        alignment=WD_ALIGN_PARAGRAPH.CENTER,
        before=0,
        after=3,
        line_spacing=1.0,
    )
    run = p.add_run("제13회 전국 ICT융합 공모전 사업계획서")
    set_run_font(run, size=18, bold=True)
    p = document.add_paragraph()
    set_paragraph_format(
        p,
        alignment=WD_ALIGN_PARAGRAPH.CENTER,
        before=0,
        after=8,
        line_spacing=1.0,
    )
    run = p.add_run("디지털 시제품 · 충북 현안 해결 AI 혁신")
    set_run_font(run, size=10, color=GRAY)

    add_standard_table(
        document,
        ["작품명(사업명)", "신청인(팀장)", "작성 기준일"],
        [["비자부기(visa-bugi)", "김태은", "2026년 8월 28일"]],
        [4300, 2500, 3280],
        font_size=9.5,
        center_columns={0, 1, 2},
    )


def add_page_break(document):
    document.add_page_break()


def build(output_path):
    document = Document()
    configure_document(document)
    assets = Path(__file__).resolve().parents[1] / "assets"

    # 1쪽 — 요약
    add_title_block(document)
    document.add_heading("1. 요약", level=1)
    add_standard_table(
        document,
        ["구분", "내용"],
        [
            [
                "제품 소개",
                "충북에 거주하거나 정착을 준비하는 외국인 주민이 복잡한 비자 공고를 직접 해석하지 않아도, 자신의 요건·서류·일정·지원기관을 한 흐름에서 확인하는 모바일 우선 디지털 비자 동행 서비스이다.",
            ],
            [
                "사업성",
                "개인에게 핵심 기능을 무료로 제공하고, 대학·기업·지자체·외국인지원기관에 담당자용 안내·검수·집계 기능을 제공하는 B2C 기반 B2G/B2B 확장 모델이다.",
            ],
            [
                "핵심 가치",
                "자격과 점수는 검수된 구조화 데이터와 결정론적 규칙으로 계산한다. 생성형 AI는 쉬운 설명·다국어 안내·근거 검색을 보조하고, 최종 행정판정을 대신하지 않는다.",
            ],
            [
                "주요 기능",
                "개인화 온보딩, 요건·점수 확인, 단계별 서류 체크, 확정 일정 관리, 기관 지도, OCR 서류 사전 점검, 위험상황 전문기관 연결을 제공한다.",
            ],
            [
                "기대효과",
                "정보 탐색시간과 서류 누락을 줄이고, 외국인 인재의 취업·비자 전환·지역 정착을 연결하며, 대학·기업·지원기관의 반복 상담 부담을 완화한다.",
            ],
        ],
        [1700, 8380],
        font_size=9.1,
        first_col_bold=True,
    )
    add_picture(
        document,
        assets / "01-dashboard-mockup.png",
        width_mm=148,
        alt_text="준비 현황 68퍼센트와 비자 여정, 다음 할 일을 보여주는 비자부기 대시보드",
        caption="그림 1. 복잡한 비자 행정을 오늘 할 일로 바꾸는 비자부기 대시보드",
    )

    # 2쪽 — 기획 배경: 문제와 정책
    add_page_break(document)
    document.add_heading("2. 기획 배경", level=1)
    document.add_heading("2-1. 문제 정의", level=2)
    add_body(
        document,
        "외국인 주민의 비자 신청과 체류자격 변경은 한 번의 검색으로 끝나지 않는다. 신청자는 공고문·붙임서식·심사표·지자체 안내·출입국 절차를 대조해 신청 가능 여부, 필수조건과 대체조건, 점수와 최소점수, 단계별 제출서류, 공고 변경사항을 스스로 판단해야 한다.",
    )
    add_body(
        document,
        "정보는 PDF·HWPX·HWP의 본문, 표, 각주와 붙임서식에 분산되어 있다. 잘못된 안내는 단순 불편을 넘어 신청 지연, 서류 재발급, 체류상 불이익으로 이어질 수 있으므로 편리함과 함께 근거성·현행성·불확실성 표시·개인정보 보호가 필요하다.",
    )
    add_metric_strip(
        document,
        [
            ("278만 3,247명", "2025년 말 국내 체류외국인"),
            ("5.44%", "전체 인구 대비 비중"),
            ("308,838명", "2025년 말 국내 유학생"),
        ],
    )
    add_caption(document, "표 1. 외국인 주민 증가로 커지는 행정 안내 수요 [1]")
    document.add_heading("2-2. 정책·시장 배경", level=2)
    add_body(
        document,
        "법무부에 따르면 2025년 말 국내 체류외국인은 전년 대비 5.0%, 국내 유학생은 17.1% 증가했다. 주요 국적도 중국·베트남·미국·태국·우즈베키스탄 등으로 다양해 다국어와 쉬운 행정 안내의 필요성이 크다. [1]",
    )
    add_body(
        document,
        "충북은 인구감소 대응과 우수 외국인력 유치를 위해 F-2-R·E-7-4R 등 지역특화형 비자를 반복 공고하고 있다. 2026년 충북 외국인 유학생 채용박람회에는 유학생 약 700명과 도내 기업 32개사가 참여했고, 인구감소지역 소재 13개 기업은 F-2-R 전환 희망 유학생과 현장 면접을 진행했다. 이는 취업·비자 전환·정착이 하나의 연속된 사용자 여정임을 보여준다. [2][3]",
    )
    add_note_box(
        document,
        "충북 현안과의 연결",
        "외국인 인재가 채용 이후 비자 전환 과정에서 이탈하지 않도록 돕는 것은 산업인력 확보와 지역 정착을 동시에 지원하는 디지털 행정 과제다.",
    )

    # 3쪽 — 제안 동기
    add_page_break(document)
    document.add_heading("2-3. 제안 동기", level=2)
    add_body(
        document,
        "팀은 화면부터 만들지 않고 실제 공고문이 서비스에서 안전하게 계산될 수 있는지를 먼저 검증했다. 비자 유형별 공식 문서에서 원문을 추출하고 자격요건·점수표·절차·서류·쿼터·변경이력으로 나눈 뒤, 사람이 원문과 대조한 데이터만 공통 데이터 구조로 이관했다.",
    )
    add_bullet(document, "표 병합셀·각주·구버전 HWP·페이지 불일치 때문에 일반 텍스트 추출만으로 정확한 구조화가 어렵다.")
    add_bullet(document, "‘미기재’와 ‘미확인’은 다르며, 빈 값을 자의적으로 해석하면 잘못된 자격 판정이 된다.")
    add_bullet(document, "비자 요건에는 중첩 AND/OR 조건, 필수 최소점수, 배타적 가점, 적용기간이 함께 존재한다.")
    add_bullet(document, "최신 공고를 덮어쓰면 차수별 변화와 당시 판단 근거를 설명할 수 없다.")
    add_note_box(
        document,
        "실제 구축 과정에서 발견한 오류",
        "E-7-4R 공고의 벌금 감점 기준이 본문·점수표와 서식에서 서로 다르게 남아 있는 충돌, HWPX의 빈 개체로 PDF와 원문 페이지가 어긋나는 사례를 확인했다. 비자부기는 이런 경우 두 근거를 모두 보존하고 자동 판정을 차단한다.",
    )
    document.add_heading("2-4. 기존 방식의 빈칸", level=2)
    add_standard_table(
        document,
        ["기존 방식", "가능한 일", "남는 문제"],
        [
            ["공고문·포털 검색", "원문과 일반 안내 확인", "사용자가 조건·서류·차수를 직접 대조"],
            ["범용 생성형 AI", "질문 응답과 쉬운 설명", "출처·최신성·논리 계산의 편차와 환각 위험"],
            ["일정·서류 앱", "개인 일정과 체크리스트", "비자 요건·공식 근거·지원기관과 분리"],
            ["비자부기", "근거 기반 요건 확인부터 행동관리까지 연결", "공식 판정은 관할기관으로 명확히 이관"],
        ],
        [1800, 3500, 4780],
        font_size=9.2,
        first_col_bold=True,
    )
    add_body(
        document,
        "비자부기의 목표는 공고문을 요약하는 데 그치지 않고, 외국인 주민이 근거 있는 정보로 다음 행동을 결정하고 끝까지 추적하도록 돕는 것이다.",
        after=0,
    )

    # 4쪽 — 목표 사용자와 전체 흐름
    add_page_break(document)
    document.add_heading("3. 기획 세부설명", level=1)
    document.add_heading("3-1. 목표 사용자와 대표 시나리오", level=2)
    add_bullet(document, "충북에서 취업·정착을 준비하는 외국인 유학생")
    add_bullet(document, "E-7-4R 등 체류자격 전환을 준비하는 외국인 근로자")
    add_bullet(document, "외국인 근로자를 채용·고용하는 충북 기업 담당자")
    add_bullet(document, "대학 국제교류부서, 가족센터, 외국인지원센터, 지자체 상담 담당자")
    add_body(
        document,
        "대표 시나리오는 충북 소재 기업에 취업한 외국인 유학생이 F-2-R 전환을 검토하거나, E-9 근로자가 E-7-4R 전환을 준비하는 과정이다. 사용자는 언어·국적·생활지역·관심 체류자격을 선택하고, 비자부기는 자격 확인→서류 준비→일정 관리→기관 연결을 한 흐름으로 제공한다.",
    )
    add_caption(document, "그림 2. 비자부기 전체 서비스 흐름")
    add_compact_flow(
        document,
        [
            ("1. 사용자 확인", "언어·국적·지역\n관심 체류자격"),
            ("2. 상황 입력", "대화형 질문\n공문서·일정"),
            ("3. 규칙 처리", "AND/OR 계산\n검토 필요 분리"),
            ("4. 행동 안내", "서류·다음 할 일\n확정 일정 관리"),
            ("5. 기관 연결", "전화·길찾기\n공식 문의 경로"),
        ],
        "공식 근거·적용기간·검증일을 표시하고 사용자가 동의한 정보만 저장",
    )
    document.add_heading("사용 경험의 원칙", level=3)
    add_bullet(document, "로그인 전 선택값은 현재 브라우저 세션에만 보관하고 최소 정보만 사용한다.")
    add_bullet(document, "불명확한 조건은 통과시키지 않고 ‘검토 필요’로 분리한다.")
    add_bullet(document, "근거 없는 상대일정은 특정 날짜로 추정하지 않는다.")
    add_bullet(document, "위험 신호에는 일반 답변을 중단하고 검증된 전문기관으로 연결한다.")

    # 5쪽 — 서비스 기능
    add_page_break(document)
    document.add_heading("3-2. 서비스 구성과 핵심 기능", level=2)
    add_standard_table(
        document,
        ["기능", "사용자에게 제공하는 결과", "판정·저장 원칙"],
        [
            ["개인화 온보딩", "약 1분 안에 언어·국적·지역·관심 비자를 선택", "로그인 전에는 세션에만 보관"],
            ["요건·점수 확인", "필수조건·대체조건·점수·부족 항목을 구분", "검수된 규칙으로 계산"],
            ["단계별 서류 체크", "작성자·제출자·제출처·첨부물까지 안내", "신청자·고용주 서류를 분리"],
            ["일정 캘린더", "방문·제출·갱신 등 확정 일정을 관리", "기준일 없는 상대일정은 추정 금지"],
            ["기관 지도", "지역·지원 분야별 기관, 전화·길찾기 연결", "GPS 좌표는 저장하지 않음"],
            ["OCR 사전 점검", "완성·확인 필요·누락·수동 확인으로 구분", "서명·동의·기관란은 자동 충족 금지"],
            ["위험상황 연결", "임금체불·산재·폭행·불법취업 등 전문기관 안내", "AI가 법률·행정 판단을 대신하지 않음"],
        ],
        [2200, 4830, 3050],
        font_size=9.1,
        first_col_bold=True,
    )
    document.add_heading("사용자에게 보이는 결과", level=3)
    add_body(
        document,
        "홈 화면은 준비 현황, 현재 단계, 다음 할 일을 한눈에 보여준다. 각 항목은 출처 문서·페이지·적용기간·마지막 검증일과 연결되어 사용자가 근거를 다시 확인할 수 있다.",
    )
    add_note_box(
        document,
        "서비스 정의",
        "비자부기는 ‘정답을 말하는 챗봇’이 아니라, 검증된 행정정보를 사용자의 다음 행동으로 바꾸는 비자·정착 동행 도구다.",
    )

    # 6쪽 — 데이터와 판정
    add_page_break(document)
    document.add_heading("3-3. 데이터 신뢰 구조와 판정 모델", level=2)
    add_body(
        document,
        "공식 문서를 자동 추출한 결과는 곧바로 서비스하지 않는다. 원문과 페이지를 보존하고, 항목 분리와 사람 검수를 거친 뒤 무결성 검증을 통과한 데이터만 서비스에 제공한다.",
    )
    add_caption(document, "그림 3. 공식 문서를 서비스 정보로 전환하는 데이터 신뢰 구조")
    add_compact_flow(
        document,
        [
            ("1. 공식 원문", "공고·지침·서식\n페이지·적용기간 보존"),
            ("2. 추출·사람 검수", "표·각주 대조\n충돌·미확인 기록"),
            ("3. 공통 데이터 구조", "13개 관계형 테이블\n조건·절차·서류·출처"),
            ("4. 서비스 제공", "규칙 계산·OCR\n다국어·기관 연결"),
        ],
        "생성형 AI가 자격을 추측하지 않고 검수된 규칙과 사람이 판단",
    )
    add_standard_table(
        document,
        ["판정 유형", "대상", "처리 방식"],
        [
            ["AUTOMATED", "수치·날짜·존재 여부", "사용자 입력과 연산자로 자동 계산"],
            ["MANUAL_REVIEW", "문서 문맥·담당기관 확인", "‘검토 필요’로 분리하고 자동 통과 금지"],
            ["INFORMATIONAL", "승인 이후 유지의무 등", "최초 자격판정에서 제외하고 안내만 제공"],
        ],
        [2200, 3500, 4380],
        font_size=9.3,
        first_col_bold=True,
    )
    add_note_box(
        document,
        "논리 계산",
        "AND 그룹은 미충족→검토 필요→충족, OR 그룹은 충족→검토 필요→미충족 순으로 판정한다. 필수 최소점수와 배타적 가점도 별도 규칙으로 관리한다.",
    )

    # 7쪽 — 통합 기능과 책임 경계
    add_page_break(document)
    document.add_heading("3-4. 서류·일정·기관·OCR의 통합", level=2)
    add_body(
        document,
        "서류는 단계별로 작성자·제출자·제출처·첨부관계를 관리한다. 일정은 사용자가 확정한 날짜 또는 기준일과 공식 offset이 검증된 경우에만 생성한다. 기관 지도는 충북 관련 연락처를 행정·교육·노동·정착지원 유형과 지역 기준으로 제공한다.",
    )
    add_body(
        document,
        "OCR은 통합신청서, F-2-R 추천서 발급 신청서, E-7-4 자체 심사표를 우선 지원한다. 허용 필드만 추출하고, 결과를 완성·확인 필요·누락·수동 확인으로 나눈다. 원본 사진과 분석 결과는 기본적으로 장기 저장하지 않는다.",
    )
    add_caption(document, "그림 4. 비자 여정 단계별 서비스 책임 경계")
    add_compact_flow(
        document,
        [
            ("1. 추적", "요건·진행 현황\n비자부기 지원"),
            ("2. 준비", "서류·OCR·일정\n비자부기+사용자"),
            ("3. 제출", "공식 링크·제출처\n공식 접수기관"),
            ("4. 판정", "승인·불허·보완\n관할 행정기관"),
        ],
        "준비까지는 비자부기가 지원하고 제출·판정은 공식기관에서 수행",
    )
    document.add_heading("개인정보와 안전 원칙", level=3)
    add_bullet(document, "GPS 사용은 선택이며 좌표를 저장하지 않고, 거부해도 시·군을 직접 선택할 수 있다.")
    add_bullet(document, "OCR 원본과 여권번호·주소 등 민감정보는 최소 처리·비저장을 기본값으로 둔다.")
    add_bullet(document, "위험상황은 일반 대화에서 분리해 전문기관 또는 전국 단위 긴급기관으로 라우팅한다.")
    add_bullet(document, "모든 자가진단 화면에 공식 결정 대체가 아니라는 책임 경계를 표시한다.")

    # 8쪽 — 근로자 여정
    add_page_break(document)
    document.add_heading("3-5. 사용자 여정 ① 이주노동자", level=2)
    add_note_box(
        document,
        "가상 페르소나",
        "응우옌 반 A · 27세 · 베트남 · E-9 · 음성군 제조업체 근무 2년 차. 장기체류 전환 가능성과 근로계약 조건 문제를 함께 확인하고 싶다.",
    )
    add_caption(document, "그림 5. 이주노동자의 E-7-4R 준비와 위험상황 연결")
    add_compact_flow(
        document,
        [
            ("1. 상황 파악", "체류기간·근무처\n연봉·한국어등급"),
            ("2. 요건 대조", "공식 기준 비교\n부족 항목 확인"),
            ("3. 일정 관리", "확정된 방문·제출\n일정만 관리"),
            ("4. 위험 확인", "계약조건 불일치\n일반 답변 중단"),
            ("5. 전문기관 연결", "노동·행정기관\n전화·위치 안내"),
        ],
        "자가진단·준비는 비자부기가 지원하고 신청·판정은 공식기관에서 수행",
    )
    add_numbered(document, "대화형 안내가 체류기간·근무처·소득·한국어능력을 한 항목씩 확인한다.")
    add_numbered(document, "규칙 엔진이 E-7-4R 공식 요건과 대조해 충족·미충족·검토 필요를 구분한다.")
    add_numbered(document, "부족한 조건과 필요한 서류를 단계별 체크리스트로 제시한다.")
    add_numbered(document, "사용자 동의가 있을 때만 확정된 방문·제출 일정을 캘린더에 추가한다.")
    add_numbered(document, "계약조건 불일치 등 위험 신호가 나오면 노동·행정 전문기관으로 즉시 연결한다.")
    add_body(
        document,
        "이 여정의 핵심은 비자 준비와 노동권 보호를 하나의 대화에서 발견하되, 서로 다른 책임 경로로 안전하게 분리하는 것이다.",
        after=0,
    )

    # 9쪽 — 유학생 여정
    add_page_break(document)
    document.add_heading("3-6. 사용자 여정 ② 외국인 유학생", level=2)
    add_note_box(
        document,
        "가상 페르소나",
        "바트 체첵 · 22세 · 몽골 · D-2 · 충북 소재 대학 재학. 시간제취업 허가와 졸업 후 충북 정착 경로를 함께 준비하고 싶다.",
    )
    add_caption(document, "그림 6. 유학생의 유학→취업→정착 준비 과정")
    add_compact_flow(
        document,
        [
            ("1. 대상 확인", "학적·TOPIK\n허가 필요성"),
            ("2. 기준 안내", "허용시간\n제한업종"),
            ("3. 서류 이해", "OCR 사전 점검\n기한·금액·제출처"),
            ("4. 서류 준비", "체크리스트\n확정 일정 관리"),
            ("5. 장기 준비", "졸업 후 F-2-R\n요건 사전 점검"),
        ],
        "학업·취업 허가와 졸업 후 정착 준비를 하나의 연속된 여정으로 관리",
    )
    add_numbered(document, "‘아르바이트를 하고 싶다’는 질문에서 학적과 한국어능력 등 확인 항목을 안내한다.")
    add_numbered(document, "허용시간·제한업종과 확인이 필요한 조건을 공식 근거와 함께 보여준다.")
    add_numbered(document, "등록금 고지서나 신청서를 촬영하면 기한·금액·제출처와 누락 항목을 사전 점검한다.")
    add_numbered(document, "대학 담당부서와 공식 신청 경로를 연결하고 확정 일정만 관리한다.")
    add_numbered(document, "졸업 후 F-2-R 전환에 필요한 학력·한국어능력·취업 조건을 미리 준비하도록 돕는다.")
    add_body(
        document,
        "채용박람회에서 시작된 만남이 취업·비자 전환·지역 정착으로 이어지도록 후속 행동을 관리하는 것이 이 시나리오의 지역적 가치다.",
        after=0,
    )

    # 10쪽 — 차별점과 데이터 자산
    add_page_break(document)
    document.add_heading("3-7. 차별점과 기술적 우수성", level=2)
    add_standard_table(
        document,
        ["비교 항목", "공고문·포털", "범용 생성형 AI", "비자부기"],
        [
            ["개인별 요건", "사용자 직접 해석", "답변 편차·환각 가능", "검수된 규칙으로 판정"],
            ["AND/OR·점수", "문서에 분산", "안정적 계산 어려움", "논리 트리·점수 모델"],
            ["차수 변경", "문서 수동 대조", "최신성 보장 어려움", "변경이력·적용기간 관리"],
            ["출처·페이지", "탐색 필요", "출처 누락 가능", "핵심 결과에 근거 연결"],
            ["행동 관리", "각각 따로 탐색", "대화 종료 후 추적 어려움", "서류·일정·기관 통합"],
            ["불확실성", "사용자가 판단", "그럴듯한 추정 위험", "미확인·검토 필요 분리"],
        ],
        [1900, 2440, 2440, 3300],
        font_size=8.8,
        first_col_bold=True,
    )
    document.add_heading("구축된 데이터·검증 자산", level=3)
    add_metric_strip(
        document,
        [
            ("13개", "관계형 테이블"),
            ("1,101행", "공통 데이터 레코드"),
            ("24건", "원천 문서"),
            ("684건", "원천→공통 매핑"),
        ],
    )
    add_metric_strip(
        document,
        [
            ("111건", "자격조건"),
            ("77건", "제출서류"),
            ("97건", "기관 연락처"),
            ("407개", "자동 테스트 통과"),
        ],
    )
    add_caption(document, "표 2. 2026년 8월 26일 팀 데이터 저장소 기준 구현 자산 [6]")
    add_body(
        document,
        "비자부기의 독창성은 ‘비자 챗봇’ 자체가 아니라, 행정문서의 논리와 변경이력을 근거 단위로 구조화하고 그 위에 행동관리 UI를 결합한 데 있다.",
        after=0,
    )

    # 11쪽 — 구현 상태
    add_page_break(document)
    document.add_heading("4. 제품(아이디어) 실현 방안", level=1)
    document.add_heading("4-1. 현재 구현 수준", level=2)
    add_caption(document, "그림 7. 현재 구현 상태와 다음 단계")
    add_compact_flow(
        document,
        [
            ("구현 완료", "데이터·온보딩·홈\n문서·기관·OCR·채팅"),
            ("시제품 검증", "실데이터 조회\n반응형 사용자 흐름"),
            ("고도화 예정", "전체 규칙 계산\n운영자 검수·현장 실증"),
        ],
        "1차 실증: 이주노동자 × E-7-4R 체류자격 트래커",
    )
    add_standard_table(
        document,
        ["구분", "현재 구현 내용"],
        [
            ["데이터", "공식 문서 추출·검수, 13개 테이블, Supabase 적재·조회, 변경·근거 관리"],
            ["사용자 화면", "6개 언어 온보딩, 목표 비자 홈, 준비 현황, 서류 단계, 캘린더, 기관 지도, 모바일 반응형 UI"],
            ["OCR·AI", "서식 템플릿 기반 OCR API, 결과 저장·확인 흐름, 근거 기반 채팅과 위험상황 라우팅 구조"],
            ["안전·접근성", "GPS·OCR 최소 저장, 서버 키 분리, 키보드 포커스, 본문 바로가기, 모션 감소 대응"],
            ["남은 핵심", "전체 자격·점수 결정론 엔진, 운영자 검수 화면, 다국어 전문 검수, 현장 사용자 테스트"],
        ],
        [2100, 7980],
        font_size=9.2,
        first_col_bold=True,
    )
    document.add_heading("기술 스택", level=3)
    add_body(
        document,
        "데이터 파이프라인은 Python 3.11+, pandas/polars, pdfplumber, pyhwp, lxml을 사용한다. 웹은 Next.js App Router·TypeScript·React·Tailwind CSS, 데이터베이스는 PostgreSQL 기반 Supabase, 배포는 Vercel을 사용한다. 품질관리는 pytest·Vitest·Ruff·ESLint·TypeScript typecheck·CI·PR 리뷰로 수행한다.",
        after=0,
    )

    # 12쪽 — 로드맵과 사업화
    add_page_break(document)
    document.add_heading("4-2. 단계별 개발 로드맵", level=2)
    add_standard_table(
        document,
        ["단계", "기간(안)", "주요 내용", "완료 기준"],
        [
            ["1단계: 판정·진행관리", "2026.09~11", "E-7-4R 규칙 엔진, 체크리스트, 일정·진행률", "자동·검토 필요·안내용 결과 분리"],
            ["2단계: 현장 실증", "2026.11~2027.02", "유학생·근로자·상담자 사용성 테스트", "과업 성공률·상담시간·누락률 측정"],
            ["3단계: 기관형 확장", "2027.03 이후", "운영자 검수, 통계, 대학·기업·지자체 도입", "유료 실증 또는 협약기관 확보"],
        ],
        [2100, 1700, 3500, 2780],
        font_size=8.9,
        first_col_bold=True,
        center_columns={1},
    )
    document.add_heading("4-3. 사업화 모델", level=2)
    add_numbered(
        document,
        "개인 사용자(B2C): 요건 확인, 기본 체크리스트, 일정, 기관 검색을 무료로 제공해 접근 장벽을 낮춘다. 서류 묶음 관리·가족 공동 준비·고급 알림은 수요와 법률·개인정보 검토 후 선택형으로 확장한다.",
    )
    add_numbered(
        document,
        "기관·지자체(B2G/B2B): 대학 국제교류부서, 외국인지원센터, 기업 인사담당자, 지자체에 기관별 체크리스트 배포, 공고 변경 알림, 담당자 검수, 비식별 집계, 근거 링크를 제공한다.",
    )
    add_numbered(
        document,
        "확장 시장: 충북 지역특화형 비자와 유학생 체류·취업 안내에서 갱신 체계를 검증한 뒤, 타 지자체 지역특화형 비자와 전국 공통 체류자격으로 확대한다.",
    )
    add_note_box(
        document,
        "수익모델",
        "기관 규모와 기능 범위에 따라 연간 사용료, 구축·연동비, 데이터 갱신·운영비를 조합한다. 구체 단가는 현장 인터뷰와 도입의향 조사 후 산정한다.",
    )

    # 13쪽 — 위험과 성과
    add_page_break(document)
    document.add_heading("4-4. 주요 위험과 해결 방안", level=2)
    add_standard_table(
        document,
        ["위험", "대응 방안"],
        [
            ["공고 변경·데이터 노후화", "적용기간·검증일·차수 관리, 변경 비교, 운영자 승인 후 배포"],
            ["원문 내부 충돌", "두 근거를 모두 보존하고 자동 판정을 차단해 담당기관 확인 상태로 표시"],
            ["AI 환각", "계산은 규칙 엔진으로 제한하고 AI는 설명·번역·검색 보조에 한정"],
            ["OCR 오인식", "원본 병기, 낮은 확신도 재촬영, 수동 확인, 최종 제출 전 사용자 확인"],
            ["개인정보 유출", "최소 수집, GPS 비저장, 민감정보 마스킹, 서버 키 분리, 보관기간 관리"],
            ["다국어 번역 오류", "핵심 용어집, 원문 병기, 전문 검수, 언어별 버전·검증일 관리"],
        ],
        [2600, 7480],
        font_size=9.0,
        first_col_bold=True,
    )
    document.add_heading("4-5. 성과 측정 계획", level=2)
    add_standard_table(
        document,
        ["지표", "측정 방법", "1차 실증 목표"],
        [
            ["요건 확인 과업 성공률", "사용성 테스트 정답 도달", "85% 이상"],
            ["필수서류 누락률", "체크리스트 모의 과업", "기존 대비 30% 감소"],
            ["정보 탐색시간", "공고문 직접 탐색군 비교", "40% 단축"],
            ["출처 확인 가능률", "결과에서 공식 근거 도달", "100%"],
            ["상담자 반복 설명시간", "기관 파일럿 전후 비교", "20% 단축"],
        ],
        [3700, 3900, 2480],
        font_size=8.8,
        first_col_bold=True,
        center_columns={2},
    )
    add_body(
        document,
        "위 수치는 현재 실적이 아니라 사업성과 검증을 위한 목표값이다. 현장 실증 전에 사용자군·표본 수·비교 조건을 확정한다.",
        size=9.5,
        italic=True,
        after=0,
    )

    # 14쪽 — 기대효과
    add_page_break(document)
    document.add_heading("5. 기대효과 및 활용분야", level=1)
    document.add_heading("5-1. 충북에 미칠 기대효과", level=2)
    add_bullet(document, "외국인 인재 정착: 취업·비자 전환·거주·행정 절차를 한 흐름으로 연결해 정보 부족에 따른 지역 이탈을 줄인다.")
    add_bullet(document, "기업 부담 완화: 고용주 요건과 제출서류를 신청자 서류와 분리하고 변경 기준을 제공해 중소기업의 행정 탐색 부담을 낮춘다.")
    add_bullet(document, "상담 품질 표준화: 대학·지원기관이 같은 공식 출처와 검증일을 공유하고 예외·충돌 사례를 검토 필요로 분리한다.")
    add_bullet(document, "데이터 기반 정책: 개인정보를 제외한 집계로 사용자가 막히는 단계와 반복 문의를 파악해 안내자료·상담 인력·지원사업을 개선한다.")
    document.add_heading("5-2. 사회·경제적 파급효과", level=2)
    add_bullet(document, "행정 정보격차와 언어 장벽 완화")
    add_bullet(document, "신청 지연·재방문·서류 재발급 등 사회적 비용 절감")
    add_bullet(document, "외국인 인재의 안정적 취업과 지역 기업 인력난 완화 지원")
    add_bullet(document, "출처와 불확실성을 투명하게 보여주는 책임 있는 공공 AI 사례 제시")
    document.add_heading("5-3. 기타 활용분야", level=2)
    add_body(
        document,
        "타 지자체 지역특화형 비자 플랫폼, 대학 유학생 관리, 기업 외국인 인력 온보딩, 외국인지원기관 상담 보조, 행정문서 변경 모니터링, 쉬운 행정정보·다국어 콘텐츠로 확장할 수 있다.",
    )
    add_note_box(
        document,
        "최종 제안",
        "비자부기는 또 하나의 정보 페이지가 아니다. 공식 문서의 복잡한 규칙을 근거와 함께 구조화하고, 요건 확인부터 서류·일정·기관 방문까지 실제 행동으로 연결하는 충북형 비자·정착 디지털 인프라다.",
    )

    # 15쪽 — 참고자료
    add_page_break(document)
    document.add_heading("참고자료 및 작성 근거", level=1)
    add_source(
        document,
        1,
        "체류외국인 주요통계",
        "법무부 출입국·외국인정책본부",
        "2025년 말 기준",
        "https://www.immigration.go.kr/moj/2412/subview.do",
    )
    add_source(
        document,
        2,
        "충북 지역특화형 비자 사업 숙련기능인력(E-7-4R) 모집 공고(2026년 6차)",
        "충청북도",
        "2026.06.09",
        "https://www.chungbuk.go.kr/www/selectGosiPblancView.do?key=422&no=68707",
    )
    add_source(
        document,
        3,
        "‘취업에서 정주까지’ 2026년 충청북도 외국인 유학생 채용박람회",
        "충청북도",
        "2026.04.28",
        "https://www.chungbuk.go.kr/www/selectBbsNttView.do?bbsNo=65&key=429&nttNo=420176",
    )
    add_source(
        document,
        4,
        "충북도, 도-시·군 외국인정책 협력회의 개최",
        "충청북도",
        "2026.04.08",
        "https://www.chungbuk.go.kr/www/selectBbsNttView.do?bbsNo=65&key=429&nttNo=418682",
    )
    add_source(
        document,
        5,
        "2025년 6월 출입국·외국인정책 통계월보",
        "법무부 출입국·외국인정책본부",
        "2025.06",
        "https://www.immigration.go.kr/bbs/immigration/227/483375/download.do",
    )
    add_source(
        document,
        6,
        "공고 원문 추출·검수·변경이력·데이터 적재 및 자동 테스트 결과",
        "비자부기 팀 visa-data 저장소",
        "2026.08.26 기준",
        "https://github.com/team-hansori/visa-data",
    )
    add_source(
        document,
        7,
        "온보딩·홈·캘린더·기관 지도·OCR·채팅 시제품 구현",
        "비자부기 팀 visa-bugi-web 저장소",
        "2026.08.28 기준",
        "https://github.com/team-hansori/visa-bugi-web",
    )
    add_note_box(
        document,
        "작성 원칙",
        "통계와 정책 주장은 공식기관 자료를 기준으로 작성했다. 데이터·구현 수치는 팀 저장소 기준이며, 성과 목표는 현재 실적이 아닌 실증 목표다. 자격 결과는 참고용 자가진단으로 제공하고 최종 신청·판정은 관할 행정기관에서 수행한다.",
    )

    props = document.core_properties
    props.title = "제13회 전국 ICT융합 공모전 비자부기 사업계획서 최종안"
    props.subject = "디지털 시제품 · 충북 현안 해결 AI 혁신"
    props.author = "비자부기 팀"
    props.keywords = "비자부기, ICT융합 공모전, 사업계획서, 외국인, 지역특화형 비자"
    props.comments = "2026년 8월 28일 기준 제출용 최종안"
    document.save(output_path)


if __name__ == "__main__":
    output = Path(__file__).resolve().parents[1] / "2026_ICT융합공모전_비자부기_사업계획서_최종안.docx"
    build(output)
    print(output)
