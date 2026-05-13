import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { accountingService } from "../services/accountingService";
import AuthPageControls from "../components/AuthPageControls";
import { getUserRole } from "../hooks/useAuthRole";
import { normalizeRole, roleAtLeast } from "../lib/roles";
import { useLanguage } from "../i18n/LanguageProvider";

import Logo from "../assets/logo_no_bg.png";

export default function Login() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const nextFieldErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      nextFieldErrors.email = t("form.fillField");
    }
    if (!password.trim()) {
      nextFieldErrors.password = t("form.fillField");
    }
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(t("auth.invalidLogin"));
      setLoading(false);
      return;
    }

    if (data.user) {
      const role = normalizeRole(
        await getUserRole(data.user.id).catch((roleError) => {
          console.error("Failed to load role after login:", roleError);
          return "user";
        }),
      );

      void accountingService
        .logActivity({
          user_id: data.user.id,
          action: "auth.login_success",
          resource: "auth",
        })
        .catch((logError) => {
          console.error("Activity log failed:", logError);
        });

      setLoading(false);

      if (roleAtLeast(role, "admin")) {
        navigate("/admin", { replace: true });
        return;
      }

      if (roleAtLeast(role, "editor")) {
        navigate("/form-submit", { replace: true });
        return;
      }

      navigate("/dashboard", { replace: true });
      return;
    }

    setLoading(false);
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f9fb] dark:bg-slate-950">
      <AuthPageControls />
      <div className="relative z-10 flex w-full max-w-md items-center justify-center rounded-2xl border-4 border-[#eaeef2] bg-white px-4 py-12 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative z-10 w-full max-w-md rounded-2xl p-8 backdrop-blur-lg">
          <div className="flex justify-center p-2">
            <img src={Logo} alt="Logo" className="h-auto w-100" />
          </div>
          <div>
            <h2 className="mb-6 text-center text-2xl font-bold text-black dark:text-white">
              {t("auth.loginTitle")}
            </h2>
          </div>
          <form noValidate onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-1 block font-medium text-gray-600 dark:text-slate-300">
                {t("auth.email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                  if (fieldErrors.email) {
                    setFieldErrors((current) => ({ ...current, email: undefined }));
                  }
                }}
                disabled={loading}
                className={`w-full rounded-lg border bg-white px-4 py-2 text-black focus:outline-none focus:ring-1 disabled:opacity-70 dark:bg-slate-950 dark:text-white ${
                  fieldErrors.email
                    ? "border-red-400 focus:ring-red-200 dark:border-red-500/60"
                    : "border-gray-500 focus:ring-[#04418b] dark:border-slate-700"
                }`}
                placeholder={t("auth.enterEmail")}
                autoComplete="email"
                required
              />
              {fieldErrors.email && (
                <p className="mt-2 text-sm text-red-500 dark:text-red-400">{fieldErrors.email}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block font-medium text-gray-600 dark:text-slate-300">
                {t("auth.password")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                  if (fieldErrors.password) {
                    setFieldErrors((current) => ({ ...current, password: undefined }));
                  }
                }}
                disabled={loading}
                className={`w-full rounded-lg border bg-white px-4 py-2 text-black focus:outline-none focus:ring-1 disabled:opacity-70 dark:bg-slate-950 dark:text-white ${
                  fieldErrors.password
                    ? "border-red-400 bg-red-50 focus:ring-red-200 dark:border-red-500/60 dark:bg-red-950/20"
                    : errorMessage
                      ? "border-red-300 bg-red-50 focus:ring-red-200 dark:border-red-500/60 dark:bg-red-950/20"
                    : "border-gray-500 focus:ring-[#04418b] dark:border-slate-700"
                }`}
                placeholder={t("auth.enterPassword")}
                autoComplete="current-password"
                required
              />
              {fieldErrors.password && (
                <p className="mt-2 text-sm text-red-500 dark:text-red-400">{fieldErrors.password}</p>
              )}
              {errorMessage && (
                <div
                  className="mt-2 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-300"
                  role="alert"
                >
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10A8 8 0 114.343 4.343 8 8 0 0118 10zm-8.75-3.5a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm0 6.5a.75.75 0 011.5 0V13a.75.75 0 01-1.5 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full rounded-lg py-2">
              {loading ? t("auth.loggingIn") : t("auth.login")}
            </button>
            <button
              type="button"
              disabled={loading}
              className="btn-secondary w-full rounded-lg py-2"
              onClick={() => navigate("/register")}
            >
              {t("auth.register")}
            </button>
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                disabled={loading}
                className="text-sm font-medium text-[#04418b] disabled:opacity-60 motion-safe:transition motion-safe:duration-200 motion-safe:ease-in-out motion-safe:hover:text-[#04416b] dark:text-sky-400 dark:hover:text-sky-300"
              >
                {t("auth.forgotPassword")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
