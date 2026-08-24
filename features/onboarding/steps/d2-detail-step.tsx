"use client";

import { useId } from "react";

const ACADEMIC_STATUS_OPTIONS = [
  { value: "LANGUAGE_COURSE", label: "어학연수" },
  { value: "ASSOCIATE", label: "전문학사" },
  { value: "BACHELOR_1_2", label: "학사 1~2학년" },
  { value: "BACHELOR_3_4", label: "학사 3~4학년" },
  { value: "GRADUATE", label: "석사·박사" },
];

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

export function D2DetailStep({ values, onChange, errors }: Props) {
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
          재학 중인 대학
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
          학과
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
          현재 과정
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
          <option value="">선택해 주세요</option>
          {ACADEMIC_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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
          입학(또는 어학연수 시작)일
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
