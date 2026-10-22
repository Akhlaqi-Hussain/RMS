"use client";
import React, { useState, useEffect } from "react";
import {
  FaEye,
  FaEyeSlash,
  FaUser,
  FaPhone,
  FaKey,
  FaUserTag,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import {
  staffSchema,
  staffEditSchema,
  validateField,
  validateForm,
} from "@/schemas/staffSchema";

const StaffForm = ({
  initialData = {},
  onSubmit,
  submitButtonText,
  isEditing = false,
  onCancel,
  resetTrigger,
}) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    role: "",
    phone: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validationSchema = isEditing ? staffEditSchema : staffSchema;
  const { t } = useLanguage();

  const roles = [
    { value: "manager", label: t("roles.manager") },
    { value: "chef", label: t("roles.chef") },
    { value: "waiter", label: t("roles.waiter") },
    { value: "cashier", label: t("roles.cashier") },
  ];

  // ✅ Populate form when editing or reset
  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        firstName: initialData.first_name || initialData.firstName || "",
        lastName: initialData.last_name || initialData.lastName || "",
        role: initialData.role || "",
        phone: initialData.phone || "",
        username: initialData.username || "",
        password: "", // Always empty for security
        confirmPassword: "", // Always empty for security
      });
    } else {
      // reset for new staff
      setFormData({
        firstName: "",
        lastName: "",
        role: "",
        phone: "",
        username: "",
        password: "",
        confirmPassword: "",
      });
    }
    setErrors({});
    setTouched({});
  }, [initialData, isEditing, resetTrigger]);

  // ✅ Handle change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ✅ Validate field on blur
  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    const validation = validateField(
      validationSchema,
      name,
      formData[name],
      formData
    );
    if (!validation.isValid)
      setErrors((prev) => ({ ...prev, [name]: validation.error }));
  };

  // ✅ Form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validateForm(validationSchema, formData);

    if (validation.isValid) {
      const { confirmPassword, ...submitData } = formData;
      if (isEditing && !submitData.password) delete submitData.password;
      onSubmit(submitData);
    } else {
      setErrors(validation.errors);
    }
  };

  // Animation settings
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 md:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold text-gray-800"
          >
            {isEditing ? t("manageStaff.update") : t("manageStaff.addNew")}
          </motion.h2>
          <p className="text-gray-500 mt-2">
            {isEditing
              ? t("manageStaff.editing", { name: `${formData.firstName} ${formData.lastName}` })
              : t("manageStaff.addSubtitle")}
          </p>
        </div>

        <motion.form
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* First and Last Name */}
          <motion.div
            variants={itemVariants}
            className="grid md:grid-cols-2 gap-6"
          >
            {/* First Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t("manageStaff.firstName")} *
              </label>
              <div className="relative">
                <FaUser className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full p-4 ps-12 border-2 rounded-xl ${
                    errors.firstName
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 focus:border-blue-500"
                  }`}
                  placeholder={t("manageStaff.firstNamePlaceholder")}
                />
              </div>
              {errors.firstName && (
                <p className="mt-2 text-sm text-red-600">{t(errors.firstName)}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t("manageStaff.lastName")} *
              </label>
              <div className="relative">
                <FaUser className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full p-4 ps-12 border-2 rounded-xl ${
                    errors.lastName
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 focus:border-blue-500"
                  }`}
                  placeholder={t("manageStaff.lastNamePlaceholder")}
                />
              </div>
              {errors.lastName && (
                <p className="mt-2 text-sm text-red-600">{t(errors.lastName)}</p>
              )}
            </div>
          </motion.div>

          {/* Role */}
          <motion.div variants={itemVariants}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t("manageStaff.role")} *
            </label>
            <div className="relative">
              <FaUserTag className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full p-4 ps-12 border-2 rounded-xl ${
                  errors.role
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 focus:border-blue-500"
                }`}
              >
                <option value="">{t("manageStaff.chooseRole")}</option>
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            {errors.role && (
              <p className="mt-2 text-sm text-red-600">{t(errors.role)}</p>
            )}
          </motion.div>

          {/* Phone & Username */}
          <motion.div
            variants={itemVariants}
            className="grid md:grid-cols-2 gap-6"
          >
            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t("manageStaff.phone")} *
              </label>
              <div className="relative">
                <FaPhone className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full p-4 ps-12 border-2 rounded-xl ${
                    errors.phone
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 focus:border-blue-500"
                  }`}
                  placeholder="07xxxxxxxx"
                />
              </div>
              {errors.phone && (
                <p className="mt-2 text-sm text-red-600">{t(errors.phone)}</p>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t("login.username")} *
              </label>
              <div className="relative">
                <FaUser className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full p-4 ps-12 border-2 rounded-xl ${
                    errors.username
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 focus:border-blue-500"
                  }`}
                  placeholder={t("manageStaff.usernamePlaceholder")}
                />
              </div>
              {errors.username && (
                <p className="mt-2 text-sm text-red-600">{t(errors.username)}</p>
              )}
            </div>
          </motion.div>

          {/* Password */}
          <motion.div variants={itemVariants}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t("login.password")} {isEditing ? t("manageMenu.optional") : "*"}
            </label>
            <div className="relative">
              <FaKey className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={
                  isEditing
                    ? t("manageStaff.passwordKeep")
                    : t("login.passwordPlaceholder")
                }
                className={`w-full p-4 ps-12 border-2 rounded-xl ${
                  errors.password
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 focus:border-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-2 text-sm text-red-600">{t(errors.password)}</p>
            )}
          </motion.div>

          {/* Confirm Password (only for add) */}
          <motion.div variants={itemVariants}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t("manageStaff.confirmPassword")} *
            </label>
            <div className="relative">
              <FaKey className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={t("manageStaff.confirmPasswordPlaceholder")}
                className={`w-full p-4 ps-12 border-2 rounded-xl ${
                  errors.confirmPassword
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 focus:border-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-600">
                {t(errors.confirmPassword)}
              </p>
            )}
          </motion.div>

          {/* Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-6 border-t border-gray-200">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl border border-gray-300 hover:bg-gray-200"
              >
                {t("common.cancel")}
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700"
            >
              {submitButtonText || t("manageStaff.create")}
            </button>
          </div>
        </motion.form>
      </div>
    </motion.div>
  );
};

export default StaffForm;
