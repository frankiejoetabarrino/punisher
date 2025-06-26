import React from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export default function AddMealPage() {
  const { t } = useTranslation();
  const mutation = useMutation(data =>
    fetch("/meals/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(res => res.json())
  );

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        const form = e.currentTarget;
        const meal = {
          name: form.name.value,
          calories: +form.calories.value,
          protein: +form.protein.value,
          carbs: +form.carbs.value,
          fat: +form.fat.value,
        };
        mutation.mutate(meal);
      }}
    >
      <label htmlFor="name">{t("Meal Name")}</label>
      <input id="name" name="name" aria-label={t("Meal Name")} required />
      {/* altri campi simili */}
      <button type="submit" disabled={mutation.isLoading}>
        {mutation.isLoading ? t("Loading...") : t("Submit")}
      </button>
    </form>
  );
}
