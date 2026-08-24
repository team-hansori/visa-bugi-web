/** LLM/DB 장애 시 정적 안내문 (env 없이도 빌드에 포함되는 상수). */
export const STATIC_FALLBACK_TEXT: Record<string, string> = {
  ko: "지금은 안내를 드릴 수 없습니다. 잠시 후 다시 시도해 주세요. 급한 비자 문의는 관할 출입국·외국인사무소 또는 가까운 외국인지원센터에 문의해 주세요.",
  zh: "当前无法提供咨询，请稍后再试。紧急签证问题请咨询管辖出入境·外国人事务所或附近的外国人支援中心。(한국어: 잠시 후 다시 시도해 주세요)",
  vi: "Hiện không thể trả lời. Vui lòng thử lại sau. Nếu gấp, hãy liên hệ Văn phòng Xuất nhập cảnh quản hạt hoặc Trung tâm hỗ trợ người nước ngoài gần nhất. (한국어: 잠시 후 다시 시도해 주세요)",
  uz: "Hozircha javob bera olmaymiz. Keyinroq qayta urinib ko'ring. Shoshilinch bo'lsa, hududiy Immigratsiya idorasi yoki yaqin atrofdagi chet elliklarni qo'llab-quvvatlash markaziga murojaat qiling. (한국어: 잠시 후 다시 시도해 주세요)",
  ne: "अहिले जवाफ दिन सकिँदैन। कृपया पछि फेरि प्रयास गर्नुहोस्। हतारो भए क्षेत्राधिकारको अध्यागमन कार्यालय वा नजिकको विदेशी सहायता केन्द्रमा सम्पर्क गर्नुहोस्। (한국어: 잠시 후 다시 시도해 주세요)",
  km: "មិនអាចឆ្លើយបានទេឥឡូវនេះ សូមព្យាយាមម្តងទៀតនៅពេលក្រោយ។ បើបន្ទាន់ សូមទាក់ទងការិយាល័យអន្តោប្រវេសន៍ ឬមជ្ឈមណ្ឌលជំនួយជនបរទេសដែលនៅជិត។ (한국어: 잠시 후 다시 시도해 주세요)",
};

export function staticFallback(locale: string): string {
  return STATIC_FALLBACK_TEXT[locale] ?? STATIC_FALLBACK_TEXT.ko;
}
