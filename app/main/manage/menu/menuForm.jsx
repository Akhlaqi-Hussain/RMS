"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useLanguage } from "@/context/LanguageContext";
import {
  menuSchema,
  menuEditSchema,
  validateField,
  validateForm,
} from "@/schemas/menuSchema";

const MenuForm = ({
  initialData = {},
  onSubmit,
  submitButtonText,
  isEditing = false,
  onCancel,
  resetTrigger,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    image: null,
    previewUrl: "",
    ...initialData,
  });

  const [errors, setErrors] = useState({});
  const { t, tServer, formatNumber } = useLanguage();
  const [touched, setTouched] = useState({});
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const fileInputRef = useRef(null);

  const validationSchema = isEditing ? menuEditSchema : menuSchema;

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("Failed to fetch categories");
        const data = await res.json();
        setCategories(data);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "image") {
      const file = files[0];
      setFormData((prev) => ({
        ...prev,
        image: file,
        previewUrl: file ? URL.createObjectURL(file) : "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

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
    else setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const allTouched = {};
    Object.keys(formData).forEach((key) => (allTouched[key] = true));
    setTouched(allTouched);

    const validation = validateForm(validationSchema, formData);

    if (validation.isValid) {
      const submitData = { ...formData };
      if (isEditing && !submitData.image) delete submitData.image;
      onSubmit(submitData);
    } else {
      setErrors(validation.errors);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      price: "",
      image: null,
      previewUrl: "",
      ...initialData,
    });
    setErrors({});
    setTouched({});
    setIsAddingCategory(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (onCancel) onCancel();
  };

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory }),
      });

      if (res.ok) {
        const newCat = await res.json();
        setCategories((prev) => [...prev, newCat]);
        setFormData((prev) => ({ ...prev, category: newCat.id }));
        setNewCategory("");
        setIsAddingCategory(false);
      } else {
        // BUG-9: tell the user why the category was not added
        const data = await res.json().catch(() => ({}));
        toast.error(tServer(data.error, "manageMenu.categoryFailed"));
      }
    } catch (err) {
      console.error("Error adding category:", err);
      toast.error(t("common.networkError"));
    }
  };

  // Reset on trigger
  useEffect(() => {
    setFormData({
      name: "",
      description: "",
      category: "",
      price: "",
      image: null,
      previewUrl: "",
      ...initialData,
    });
    setErrors({});
    setTouched({});
    setIsAddingCategory(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [resetTrigger]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-md">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent"
          >
            {isEditing ? t("manageMenu.editTitle") : t("manageMenu.addNew")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 mt-2"
          >
            {isEditing
              ? t("manageMenu.editSubtitle")
              : t("manageMenu.addSubtitle")}
          </motion.p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label
              htmlFor="name"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              {t("manageMenu.fieldName")} *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full p-4 border-2 rounded-xl text-start transition-all duration-200 focus:ring-4 ${
                errors.name
                  ? "border-red-500 focus:ring-red-500/20 bg-red-50"
                  : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 hover:border-gray-300"
              }`}
              placeholder={t("manageMenu.namePlaceholder")}
            />
            <AnimatePresence>
              {errors.name && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 text-sm text-red-600 flex items-center gap-1"
                >
                  {t(errors.name)}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <label
              htmlFor="description"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              {t("manageMenu.fieldDescription")} *
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full p-4 border-2 rounded-xl text-start transition-all duration-200 focus:ring-4 resize-none ${
                errors.description
                  ? "border-red-500 focus:ring-red-500/20 bg-red-50"
                  : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 hover:border-gray-300"
              }`}
              placeholder={t("manageMenu.descriptionPlaceholder")}
            />
            <AnimatePresence>
              {errors.description && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 text-sm text-red-600 flex items-center gap-1"
                >
                  {t(errors.description)}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Category & Price */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Category */}
            <div className="space-y-3">
              <label
                htmlFor="category"
                className="block text-sm font-semibold text-gray-700"
              >
                {t("manageMenu.fieldCategory")} *
              </label>
              <div className="space-y-3">
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full p-4 border-2 rounded-xl text-start transition-all duration-200 focus:ring-4 ${
                    errors.category
                      ? "border-red-500 focus:ring-red-500/20 bg-red-50"
                      : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 hover:border-gray-300"
                  }`}
                >
                  <option value="">{t("manageMenu.chooseCategory")}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                {/* Add Category Toggle */}
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span>+</span>
                  {t("manageMenu.addCategory")}
                </button>

                {/* Add Category Input */}
                <AnimatePresence>
                  {isAddingCategory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        placeholder={t("manageMenu.newCategoryPlaceholder")}
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="flex-1 min-w-0 p-3 border-2 border-gray-200 rounded-xl text-start focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200"
                      />
                      <motion.button
                        type="button"
                        onClick={handleAddCategory}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-3 bg-green-500 text-white rounded-xl shadow-lg hover:bg-green-600 transition-colors duration-200"
                      >
                        {t("common.add")}
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {errors.category && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-red-600 flex items-center gap-1"
                  >
                    {t(errors.category)}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Price */}
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                {t("manageMenu.fieldPrice")} *
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full p-4 border-2 rounded-xl text-start transition-all duration-200 focus:ring-4 pe-12 ${
                    errors.price
                      ? "border-red-500 focus:ring-red-500/20 bg-red-50"
                      : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 hover:border-gray-300"
                  }`}
                  placeholder={formatNumber(0)}
                />
                <span className="absolute end-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                  {t("common.currencySign")}
                </span>
              </div>
              <AnimatePresence>
                {errors.price && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 text-sm text-red-600 flex items-center gap-1"
                  >
                    {t(errors.price)}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Image Upload */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <label
              htmlFor="image"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              {t("manageMenu.fieldImage")} {isEditing && t("manageMenu.optional")}
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 sm:p-6 text-center transition-all duration-200 hover:border-gray-400 hover:bg-gray-50">
              <input
                ref={fileInputRef}
                type="file"
                id="image"
                name="image"
                accept="image/*"
                onChange={handleChange}
                className="hidden"
              />
              <label htmlFor="image" className="cursor-pointer block">
                <div className="text-gray-400 mb-2 text-4xl">📷</div>
                <p className="text-gray-600 font-medium">
                  {t("manageMenu.uploadHint")}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {t("manageMenu.allowedFormats")}
                </p>
              </label>
            </div>
            <AnimatePresence>
              {errors.image && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 text-sm text-red-600 flex items-center gap-1"
                >
                  {t(errors.image)}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-6 border-t border-gray-200"
          >
            <motion.button
              type="button"
              onClick={handleCancel}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 sm:px-8 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl shadow-sm hover:bg-gray-200 transition-colors duration-200 border border-gray-300"
            >
              {t("common.cancel")}
            </motion.button>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 sm:px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
            >
              {submitButtonText || t("manageMenu.create")}
            </motion.button>
          </motion.div>
        </form>
      </div>
    </motion.div>
  );
};

export default MenuForm;
