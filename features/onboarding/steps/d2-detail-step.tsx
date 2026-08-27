"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";

export type D2Values = {
  universityName: string;
  departmentName: string;
  academicStatus: string;
  programStartDate: string;
};

type Props = {
  values: D2Values;
  onChange: (next: D2Values) => void;
  errors: Partial<Record<keyof D2Values, string>>;
};

const ACADEMIC_STATUS_KEYS = [
  "LANGUAGE_COURSE",
  "ASSOCIATE",
  "BACHELOR_1_2",
  "BACHELOR_3_4",
  "GRADUATE",
] as const;

export function D2DetailStep({ values, onChange, errors }: Props) {
  const t = useTranslations("Onboarding");
  const universityId = useId();
  const departmentId = useId();
  const statusId = useId();
  const startDateId = useId();

  const fieldClass =
    "mt-2 min-h-14 w-full rounded-2xl border border-[#dfe5e1] px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]";
  const labelClass = "block text-sm font-extrabold text-[#33453e]";
  const errorClass = "mt-2 text-sm font-semibold text-[#9f4038]";

  return (
    <div className="grid gap-5">
      <div>
        <label htmlFor={universityId} className={labelClass}>
          {t("d2UniversityLabel")}
        </label>
        <input
          id={universityId}
          value={values.universityName}
          aria-invalid={errors.universityName !== undefined}
          onChange={(event) =>
            onChange({ ...values, universityName: event.target.value })
          }
          className={fieldClass}
        />
        {errors.universityName ? (
          <p role="alert" className={errorClass}>
            {errors.universityName}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={departmentId} className={labelClass}>
          {t("d2DepartmentLabel")}
        </label>
        <input
          id={departmentId}
          value={values.departmentName}
          aria-invalid={errors.departmentName !== undefined}
          onChange={(event) =>
            onChange({ ...values, departmentName: event.target.value })
          }
          className={fieldClass}
        />
        {errors.departmentName ? (
          <p role="alert" className={errorClass}>
            {errors.departmentName}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={statusId} className={labelClass}>
          {t("d2AcademicStatusLabel")}
        </label>
        <select
          id={statusId}
          value={values.academicStatus}
          aria-invalid={errors.academicStatus !== undefined}
          onChange={(event) =>
            onChange({ ...values, academicStatus: event.target.value })
          }
          className={fieldClass}
        >
          <option value="">{t("d2SelectPlaceholder")}</option>
          {ACADEMIC_STATUS_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(`academicStatusOptions.${key}`)}
            </option>
          ))}
        </select>
        {errors.academicStatus ? (
          <p role="alert" className={errorClass}>
            {errors.academicStatus}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={startDateId} className={labelClass}>
          {t("d2ProgramStartDateLabel")}
        </label>
        <input
          id={startDateId}
          type="date"
          value={values.programStartDate}
          max={new Date().toISOString().slice(0, 10)}
          aria-invalid={errors.programStartDate !== undefined}
          onChange={(event) =>
            onChange({ ...values, programStartDate: event.target.value })
          }
          className={fieldClass}
        />
        {errors.programStartDate ? (
          <p role="alert" className={errorClass}>
            {errors.programStartDate}
          </p>
        ) : null}
      </div>
    </div>
  );
}
