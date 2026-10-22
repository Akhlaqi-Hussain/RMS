"use client";
import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

const TableForm = ({
  initialData = {},
  onSubmit,
  submitButtonText,
  isEditing = false,
  onCancel,
  resetTrigger,
  isSubmitting = false,
}) => {
  const { t } = useLanguage();
  const [tableNo, setTableNo] = useState(initialData.table_no || "");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  // Reset form when resetTrigger changes or initialData changes.
  // LINT-1: done while rendering (React's "adjust state when a prop changes"
  // pattern) instead of in an effect; the result on screen is the same.
  const [prevProps, setPrevProps] = useState({ initialData, resetTrigger });
  if (prevProps.initialData !== initialData || prevProps.resetTrigger !== resetTrigger) {
    setPrevProps({ initialData, resetTrigger });
    setTableNo(initialData.table_no || "");
    setError("");
    setTouched(false);
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    setTouched(true);

    // Validation
    if (!tableNo.trim()) {
      setError("server.tableNumberRequired");
      return;
    }

    if (tableNo.trim().length < 1) {
      setError("manageTables.numberMin");
      return;
    }

    const submitData = {
      table_no: tableNo.trim(),
    };

    onSubmit(submitData);
  };

  const handleCancel = () => {
    setTableNo("");
    setError("");
    setTouched(false);
    if (onCancel) onCancel();
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setTableNo(value);

    if (error && value.trim() && value.trim().length >= 1) {
      setError("");
    }
  };

  const handleBlur = () => {
    setTouched(true);
    if (!tableNo.trim()) {
      setError("server.tableNumberRequired");
    } else if (tableNo.trim().length < 1) {
      setError("manageTables.numberMin");
    } else {
      setError("");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            {isEditing ? t("manageTables.update") : t("manageTables.addNew")}
          </h2>
          <p className="text-gray-500 mt-2">
            {isEditing
              ? t("manageTables.editSubtitle")
              : t("manageTables.addSubtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Table Number Input */}
          <div>
            <label
              htmlFor="tableNo"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              {t("manageTables.colNumber")} *
            </label>
            <div className="relative">
              <input
                type="text"
                id="tableNo"
                name="tableNo"
                value={tableNo}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full p-4 border-2 rounded-xl text-start transition-all duration-200 focus:ring-4 ${
                  error
                    ? "border-red-500 focus:ring-red-500/20 bg-red-50"
                    : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 hover:border-gray-300"
                }`}
                placeholder={t("manageTables.numberPlaceholder")}
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                {t(error)}
              </p>
            )}
            <p className="mt-2 text-sm text-gray-500">
              {t("manageTables.numberHint")}
            </p>
          </div>

          {/* Buttons - At the end like MenuForm */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-6 sm:px-8 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl shadow-sm hover:bg-gray-200 transition-colors duration-200 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("common.cancel")}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 sm:px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t("manageMenu.submitting")}
                </span>
              ) : (
                submitButtonText || t("manageTables.create")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TableForm;
