"use client";
import React, { useState, useEffect } from "react";

const TableForm = ({
  initialData = {},
  onSubmit,
  submitButtonText = "ثبت میز",
  isEditing = false,
  onCancel,
  resetTrigger,
  isSubmitting = false,
}) => {
  const [tableNo, setTableNo] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  // Reset form when resetTrigger changes or initialData changes
  useEffect(() => {
    setTableNo(initialData.table_no || "");
    setError("");
    setTouched(false);
  }, [initialData, resetTrigger]);

  const handleSubmit = (e) => {
    e.preventDefault();

    setTouched(true);

    // Validation
    if (!tableNo.trim()) {
      setError("شماره میز الزامی است");
      return;
    }

    if (tableNo.trim().length < 1) {
      setError("شماره میز باید حداقل ۱ کاراکتر باشد");
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
      setError("شماره میز الزامی است");
    } else if (tableNo.trim().length < 1) {
      setError("شماره میز باید حداقل ۱ کاراکتر باشد");
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
            {isEditing ? "ویرایش میز" : "افزودن میز جدید"}
          </h2>
          <p className="text-gray-500 mt-2">
            {isEditing
              ? "شماره میز را ویرایش کنید"
              : "شماره میز جدید را وارد کنید"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Table Number Input */}
          <div>
            <label
              htmlFor="tableNo"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              شماره میز *
            </label>
            <div className="relative">
              <input
                type="text"
                id="tableNo"
                name="tableNo"
                value={tableNo}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full p-4 border-2 rounded-xl text-right transition-all duration-200 focus:ring-4 ${
                  error
                    ? "border-red-500 focus:ring-red-500/20 bg-red-50"
                    : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 hover:border-gray-300"
                }`}
                placeholder="مثلاً: A-21, ۱۵, VIP-1"
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                {error}
              </p>
            )}
            <p className="mt-2 text-sm text-gray-500">
              می‌توانید از اعداد، حروف و خط تیره استفاده کنید
            </p>
          </div>

          {/* Buttons - At the end like MenuForm */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-8 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl shadow-sm hover:bg-gray-200 transition-colors duration-200 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              انصراف
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  در حال ثبت...
                </span>
              ) : (
                submitButtonText
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TableForm;
