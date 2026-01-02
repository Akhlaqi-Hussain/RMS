"use client";
import React, { useState } from "react";
import { FaEye, FaEyeSlash, FaArrowRight } from "react-icons/fa";
import {
  loginSchema,
  validateField,
  validateForm,
} from "@/schemas/loginSchema";

const Login = ({ onSubmit }) => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    const { error } = validateField(loginSchema, name, formData[name]);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allTouched = {};
    Object.keys(formData).forEach((key) => (allTouched[key] = true));
    setTouched(allTouched);

    const { isValid, errors: formErrors } = validateForm(loginSchema, formData);
    setErrors(formErrors);

    if (isValid) {
      setIsSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      onSubmit(formData);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{
        background:
          "linear-gradient(to bottom right, var(--color-surface), #f9f9f9)",
      }}
    >
      <div className="flex-1 flex items-center justify-center p-6 border border">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <div className="p-8">
            <div className="text-center mb-8">
              <h2
                className="text-3xl font-bold mb-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                خوش آمدید
              </h2>
              <p className="text-gray-600">
                لطفا برای ادامه وارد حساب کاربری خود شوید
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium mb-2 mr-1"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  نام کاربری
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full p-3 border rounded-xl shadow-sm text-right transition-all duration-200 focus:ring-2 focus:border-transparent ${
                    errors.username && touched.username
                      ? "border-red-500"
                      : "border-gray-300 focus:ring-[var(--color-primary)]"
                  }`}
                  placeholder="نام کاربری خود را وارد کنید"
                />
                {errors.username && touched.username && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    {errors.username}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-2 mr-1"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  رمز عبور
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full p-3 border rounded-xl shadow-sm text-right pr-12 transition-all duration-200 focus:ring-2 focus:border-transparent ${
                      errors.password && touched.password
                        ? "border-red-500"
                        : "border-gray-300 focus:ring-[var(--color-primary)]"
                    }`}
                    placeholder="رمز عبور خود را وارد کنید"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
                  >
                    {showPassword ? (
                      <FaEyeSlash size={16} />
                    ) : (
                      <FaEye size={16} />
                    )}
                  </button>
                </div>
                {errors.password && touched.password && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    {errors.password}
                  </p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center px-6 py-3 text-base font-medium rounded-xl shadow-md transition-all duration-300 disabled:opacity-75 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-text-on-primary)",
                  }}
                >
                  {isSubmitting ? (
                    "در حال ورود..."
                  ) : (
                    <>
                      ورود <FaArrowRight className="mr-2" size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
