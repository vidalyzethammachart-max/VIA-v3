import { Link } from "react-router-dom";

import Logo from "../assets/logo.png";
import ProfileDropdown from "./ProfileDropdown";
import { useTheme } from "../theme/ThemeProvider";
import { useLanguage } from "../i18n/LanguageProvider";

type MainNavbarProps = {
  title?: string;
  subtitle?: string;
};

export default function MainNavbar({ title, subtitle }: MainNavbarProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === "dark";

  return (
    <header
      className={`sticky top-0 z-20 border-b backdrop-blur ${
        isDark
          ? "border-slate-800 bg-slate-950/90"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="w-full px-4 py-2">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            aria-label="Go to home"
            className="ui-hover-button inline-flex rounded-md"
          >
            <img src={Logo} alt="VIA Logo" className="h-8 w-auto rounded-md" />
          </Link>

          <div className="flex flex-col gap-0 leading-none">
            <span
              className={`text-xs font-semibold tracking-wide ${
                isDark ? "text-white" : "text-primary"
              }`}
            >
              {t("navbar.brand")}
            </span>
            <h1
              className={`text-base font-semibold leading-tight ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {title ?? t("navbar.title")}
            </h1>
            <p
              className={`text-xs leading-tight ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {subtitle ?? t("navbar.subtitle")}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <ProfileDropdown />
          </div>
        </div>
      </div>
    </header>
  );
}
