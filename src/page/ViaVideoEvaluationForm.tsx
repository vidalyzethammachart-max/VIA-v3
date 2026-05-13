import { useMemo, useRef, useState } from "react";

import MainNavbar from "../components/MainNavbar";
import { getSections, type LikertValue } from "../config/sections";
import { useLanguage } from "../i18n/LanguageProvider";

const MAX_VIDEO_SIZE_BYTES = 1024 * 1024 * 1024;
const N8N_WEBHOOK_URL = import.meta.env.VITE_VIDEO_EVALUATION_WEBHOOK_URL || "";
const SCORE_VALUES: LikertValue[] = [1, 2, 3, 4, 5];

type RubricAnswers = Record<string, Record<string, LikertValue | undefined>>;
type RubricPayload = Record<string, Record<string, LikertValue | null>>;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function validateVideoFile(file: File | null) {
  if (!file) return "กรุณาเลือกไฟล์วิดีโอก่อนส่งแบบประเมิน";
  if (!file.type.startsWith("video/")) return "ไฟล์ที่อัปโหลดต้องเป็นวิดีโอเท่านั้น";
  if (file.size > MAX_VIDEO_SIZE_BYTES) return "ไฟล์วิดีโอต้องมีขนาดไม่เกิน 1GB";
  return null;
}

export default function ViaVideoEvaluationForm() {
  const { language } = useLanguage();
  const sections = useMemo(() => getSections(language), [language]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [subjectName, setSubjectName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [overallSuggestion, setOverallSuggestion] = useState("");
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [rubric, setRubric] = useState<RubricAnswers>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const buildRubricPayload = (): RubricPayload => {
    const payload: RubricPayload = {};

    sections.forEach((section) => {
      payload[section.id] = {};

      section.questions.forEach((question) => {
        payload[section.id][question.storageKey] =
          rubric[section.id]?.[question.id] ?? null;
      });
    });

    return payload;
  };

  const findMissingRubricSection = () => {
    for (const section of sections) {
      for (const question of section.questions) {
        if (typeof rubric[section.id]?.[question.id] !== "number") {
          return section.title;
        }
      }
    }

    return null;
  };

  const validateForm = () => {
    if (!N8N_WEBHOOK_URL) return "ยังไม่ได้ตั้งค่า VITE_VIDEO_EVALUATION_WEBHOOK_URL";
    if (!subjectName.trim()) return "กรุณากรอก subject_name";
    if (!orderNumber.trim()) return "กรุณากรอก order_number";
    if (!email.trim()) return "กรุณากรอก email";
    if (!overallSuggestion.trim()) return "กรุณากรอก overall_suggestion";

    const videoError = validateVideoFile(selectedVideoFile);
    if (videoError) return videoError;

    const missingRubricSection = findMissingRubricSection();
    if (missingRubricSection) {
      return `กรุณาให้คะแนน rubric ให้ครบทุกข้อในหมวด ${missingRubricSection}`;
    }

    return null;
  };

  const handleRubricChange = (
    sectionId: string,
    questionId: string,
    score: LikertValue,
  ) => {
    setRubric((current) => ({
      ...current,
      [sectionId]: {
        ...current[sectionId],
        [questionId]: score,
      },
    }));
  };

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedVideoFile(file);
    setSuccessMessage(null);
    setErrorMessage(file ? validateVideoFile(file) : null);
  };

  const resetForm = () => {
    setSubjectName("");
    setOrderNumber("");
    setEmail("");
    setOverallSuggestion("");
    setSelectedVideoFile(null);
    setRubric({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError || !selectedVideoFile) {
      setErrorMessage(validationError);
      setSuccessMessage(null);
      return;
    }

    const formData = new FormData();
    formData.append("video", selectedVideoFile);
    formData.append("subject_name", subjectName.trim());
    formData.append("order_number", orderNumber.trim());
    formData.append("email", email.trim());
    formData.append("overall_suggestion", overallSuggestion.trim());
    formData.append("rubric", JSON.stringify(buildRubricPayload()));

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => "");
        throw new Error(responseText || "ส่งข้อมูลไป n8n ไม่สำเร็จ");
      }

      resetForm();
      setSuccessMessage("ส่งแบบประเมินและวิดีโอเรียบร้อยแล้ว");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "ส่งแบบประเมินและวิดีโอไม่สำเร็จ",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <MainNavbar title="VIA Video Evaluation" subtitle="Submit rubric and video to n8n" />

      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="mb-5">
              <h1 className="text-2xl font-bold text-slate-900">VIA form with video upload</h1>
              <p className="mt-1 text-sm text-slate-500">
                กรอกข้อมูลแบบประเมิน อัปโหลดวิดีโอ และส่งเข้า n8n webhook
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-800">subject_name</label>
                <input
                  value={subjectName}
                  onChange={(event) => setSubjectName(event.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-[#04418b] focus:ring-2 focus:ring-[#04418b]/15"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-800">order_number</label>
                <input
                  value={orderNumber}
                  onChange={(event) => setOrderNumber(event.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-[#04418b] focus:ring-2 focus:ring-[#04418b]/15"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-800">email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-[#04418b] focus:ring-2 focus:ring-[#04418b]/15"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-800">
                  overall_suggestion
                </label>
                <textarea
                  value={overallSuggestion}
                  onChange={(event) => setOverallSuggestion(event.target.value)}
                  rows={4}
                  required
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-[#04418b] focus:ring-2 focus:ring-[#04418b]/15"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <label className="text-sm font-semibold text-slate-800">video</label>
            <p className="mt-1 text-xs text-slate-500">Required, video/*, maximum 1GB.</p>
            <input
              ref={fileInputRef}
              type="file"
              name="video"
              accept="video/*"
              required
              onChange={handleVideoChange}
              disabled={isSubmitting}
              className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-[#04418b] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#03326a] disabled:opacity-60"
            />
            {selectedVideoFile && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <p className="font-medium text-slate-900">{selectedVideoFile.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedVideoFile.type || "video/*"} | {formatBytes(selectedVideoFile.size)}
                </p>
              </div>
            )}
          </section>

          <section className="space-y-5">
            {sections.map((section) => (
              <div
                key={section.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6"
              >
                <div className="mb-4 flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#04418b] text-sm font-bold text-white">
                    {section.id}
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{section.title}</h2>
                    {section.description && (
                      <p className="mt-1 text-sm text-slate-500">{section.description}</p>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {section.questions.map((question, questionIndex) => (
                    <div key={question.id} className="py-4">
                      <p className="mb-3 text-sm font-medium text-slate-800">
                        {questionIndex + 1}. {question.label}
                      </p>
                      <div className="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap">
                        {SCORE_VALUES.map((score) => {
                          const inputId = `${section.id}-${question.id}-${score}`;
                          const selected = rubric[section.id]?.[question.id] === score;

                          return (
                            <label
                              key={score}
                              htmlFor={inputId}
                              className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                selected
                                  ? "border-[#04418b] bg-[#04418b] text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-[#04418b]"
                              }`}
                            >
                              <input
                                id={inputId}
                                type="radio"
                                name={`rubric-${section.id}-${question.id}`}
                                value={score}
                                checked={selected}
                                required
                                onChange={() =>
                                  handleRubricChange(section.id, question.id, score)
                                }
                                className="sr-only"
                              />
                              {score}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              {successMessage}
            </div>
          )}

          <div className="flex justify-end pb-10">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-[#04418b] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#03326a] disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "กำลังส่ง..." : "ส่งแบบประเมินและวิดีโอ"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
