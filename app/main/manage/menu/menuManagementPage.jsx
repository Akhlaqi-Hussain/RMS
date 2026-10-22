"use client";
import { useEffect, useState, useRef } from "react";
import MenuList from "./menuList";
import MenuForm from "./menuForm";
import toast from "react-hot-toast";
import { useLanguage } from "@/context/LanguageContext";

export default function MenuManagementPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useLanguage();

  // modal/form control
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Ref for the form container
  const formRef = useRef(null);

  // Fetch menu items from API
  async function fetchMenuItems() {
    try {
      const res = await fetch("/api/menu", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch menu items");
      const data = await res.json();
      setMenuItems(data);
      console.log(data);
    } catch (err) {
      console.error("Error fetching menu items:", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMenuItems();
  }, []);

  // Scroll to form function
  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });

      setTimeout(() => {
        if (formRef.current) {
          formRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest",
          });
        }
      }, 100);
    }
  };

  // Handle submit for add/edit
  async function handleFormSubmit(data) {
    setSubmitting(true);
    try {
      const formData = new FormData();

      // Append all form data
      Object.keys(data).forEach((key) => {
        if (data[key] !== null && data[key] !== "") {
          // For file inputs, append the file, otherwise append the value
          if (key === "image" && data[key] instanceof File) {
            formData.append(key, data[key]);
          } else if (key !== "image" || (key === "image" && data[key])) {
            formData.append(key, data[key]);
          }
        }
      });

      let url = "/api/menu";
      let method = "POST";

      if (editingItem) {
        // editing mode - use the PUT API
        url = `/api/menu/${editingItem.id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save menu item");
      }

      const result = await res.json();

      // Show success message
      toast.success(
        editingItem ? t("server.itemUpdated") : t("server.itemAdded")
      );

      await fetchMenuItems(); // refresh list
      handleCloseForm();
    } catch (err) {
      console.error("Error saving item:", err);
      toast.error(t("manageMenu.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  // Handle status toggle - FIXED: Use PATCH method
  async function handleToggleStatus(itemId, currentStatus) {
    try {
      const newStatus = !currentStatus;

      const res = await fetch(`/api/menu/${itemId}`, {
        method: "PATCH", // Changed from PUT to PATCH
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: newStatus }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      toast.success(newStatus ? t("server.itemActivated") : t("server.itemDeactivated"));

      await fetchMenuItems(); // refresh list
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error(t("server.statusUpdateFailed"));
    }
  }

  // Handle delete menu item
  async function handleDeleteItem(itemId) {
    if (!confirm(t("manageMenu.deleteConfirm"))) {
      return;
    }

    try {
      const res = await fetch(`/api/menu/${itemId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete menu item");
      }

      toast.success(t("server.itemDeleted"));
      await fetchMenuItems(); // refresh list
    } catch (err) {
      console.error("Error deleting menu item:", err);
      toast.error(t("server.itemDeleteFailed"));
    }
  }

  function handleOpenAddForm() {
    setEditingItem(null);
    setShowForm(true);
    setResetTrigger((prev) => prev + 1);

    setTimeout(() => {
      scrollToForm();
    }, 50);
  }

  function handleOpenEditForm(item) {
    setEditingItem(item);
    setShowForm(true);
    setResetTrigger((prev) => prev + 1);

    setTimeout(() => {
      scrollToForm();
    }, 50);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingItem(null);
  }

  // Scroll to form when showForm becomes true
  useEffect(() => {
    if (showForm) {
      scrollToForm();
    }
  }, [showForm]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h2 className="text-xl font-bold">{t("manageMenu.title")}</h2>
        <button
          onClick={handleOpenAddForm}
          disabled={submitting}
          className="bg-[color:var(--color-primary)] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity duration-200 disabled:opacity-50"
        >
          {submitting ? t("manageMenu.submitting") : t("manageMenu.addNew")}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--color-primary)]"></div>
        </div>
      ) : (
        <MenuList
          items={menuItems}
          onEdit={handleOpenEditForm}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDeleteItem}
        />
      )}

      {/* Form Container with ref */}
      <div ref={formRef}>
        {showForm && (
          <MenuForm
            initialData={editingItem || {}}
            onSubmit={handleFormSubmit}
            isEditing={!!editingItem}
            onCancel={handleCloseForm}
            resetTrigger={resetTrigger}
            submitButtonText={
              submitting
                ? t("manageMenu.submitting")
                : editingItem
                ? t("manageMenu.update")
                : t("manageMenu.create")
            }
            isSubmitting={submitting}
          />
        )}
      </div>
    </div>
  );
}
