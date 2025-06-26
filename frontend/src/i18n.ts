import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: { "Meal Name": "Meal Name", "Submit": "Submit", "Loading...": "Loading..." } },
      it: { translation: { "Meal Name": "Nome pasto", "Submit": "Invia", "Loading...": "Caricamento..." } }
    },
    lng: "it",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
