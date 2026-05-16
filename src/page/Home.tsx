import { Link } from "react-router-dom";

import Logo from "../assets/logo_no_bg.png";
import MainNavbar from "../components/MainNavbar";
import { useLanguage } from "../i18n/LanguageProvider";

type HomeAction = {
  href: string;
  title: string;
};

export default function Home() {
  const { t } = useLanguage();

  const actions: HomeAction[] = [
    {
      href: "/dashboard",
      title: t("home.dashboardTitle"),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <MainNavbar />

      <main className="mx-auto flex min-h-[calc(100vh-160px)] max-w-5xl flex-col items-center justify-center px-4 py-10">
        <section className="mb-8 flex flex-col items-center text-center">
          <img
            src={Logo}
            alt="Video Intelligence & Analytics"
            className="h-28 w-auto object-contain md:h-36"
          />
          <h1 className="mt-5 text-2xl font-bold text-slate-900 md:text-3xl">
            Video Intelligence & Analytics
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
            {t("navbar.subtitle")}
          </p>
        </section>

        <section className="flex w-full max-w-3xl justify-center">
          {actions.map((action) => (
            <Link
              key={action.href}
              to={action.href}
              className="ui-hover-button inline-flex min-h-14 w-full max-w-sm items-center justify-center rounded-xl border border-[#04418b] bg-[#04418b] px-5 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#03326a]"
            >
              {action.title}
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
