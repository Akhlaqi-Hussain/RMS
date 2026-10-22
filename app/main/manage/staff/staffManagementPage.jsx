"use client";
import { useEffect, useState, useRef } from "react";
import StaffList from "./staffList";
import StaffForm from "./staffForm";
import toast from "react-hot-toast";
import { useLanguage } from "@/context/LanguageContext";

export default function StaffManagementPage() {
  const { t, tServer } = useLanguage();
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // modal/form control
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Ref for the form container
  const formRef = useRef(null);

  // Fetch staff members from API
  async function fetchStaffMembers() {
    try {
      const res = await fetch("/api/staff", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch staff members");
      const data = await res.json();
      setStaffMembers(data);
    } catch (err) {
      console.error("Error fetching staff members:", err.message);
      toast.error(t("server.staffListFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStaffMembers();
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
      let url = "/api/staff";
      let method = "POST";

      if (editingStaff) {
        // editing mode - use the PUT API
        url = `/api/staff/${editingStaff.id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save staff member");
      }

      const result = await res.json();

      // Show success message
      toast.success(
        editingStaff ? t("server.staffUpdated") : t("server.staffAdded")
      );

      await fetchStaffMembers(); // refresh list
      handleCloseForm();
    } catch (err) {
      console.error("Error saving staff member:", err);
      toast.error(t("manageStaff.saveFailed", { reason: tServer(err.message) }));
    } finally {
      setSubmitting(false);
    }
  }

  // Activate/Deactivate staff member
  async function handleToggleStatus(staffId, currentStatus) {
    try {
      const res = await fetch(`/api/staff/${staffId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      toast.success(!currentStatus ? t("server.staffActivated") : t("server.staffDeactivated"));
      await fetchStaffMembers(); // refresh list
    } catch (err) {
      console.error("Error updating staff status:", err);
      toast.error(t("manageStaff.statusFailed", { reason: tServer(err.message) }));
    }
  }

  function handleOpenAddForm() {
    setEditingStaff(null);
    setShowForm(true);
    setResetTrigger((prev) => prev + 1);

    setTimeout(() => {
      scrollToForm();
    }, 50);
  }

  function handleOpenEditForm(staff) {
    console.log("Editing staff:", staff);

    // Transform the staff data to match what StaffForm expects
    const formData = {
      id: staff.id,
      firstName: staff.first_name || staff.firstName,
      lastName: staff.last_name || staff.lastName,
      role: staff.role,
      phone: staff.phone,
      username: staff.username,
      // Don't include password for security
    };

    setEditingStaff(formData);
    setShowForm(true);
    setResetTrigger((prev) => prev + 1);

    setTimeout(() => {
      scrollToForm();
    }, 50);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingStaff(null);
  }

  // Delete staff member
  async function handleDeleteStaff(staffId) {
    if (!confirm(t("manageStaff.deleteConfirm"))) {
      return;
    }

    try {
      const res = await fetch(`/api/staff/${staffId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete staff member");
      }

      toast.success(t("manageStaff.deleted"));
      await fetchStaffMembers(); // refresh list
    } catch (err) {
      console.error("Error deleting staff:", err);
      toast.error(t("manageStaff.deleteFailed", { reason: tServer(err.message) }));
    }
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
        <h2 className="text-xl font-bold">{t("manageStaff.title")}</h2>
        <button
          onClick={handleOpenAddForm}
          disabled={submitting}
          className="bg-[color:var(--color-primary)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[color:var(--color-primary-light)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        >
          {submitting ? t("manageMenu.submitting") : t("manageStaff.addNew")}
        </button>
      </div>

      {/* Staff List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--color-primary)]"></div>
        </div>
      ) : (
        <StaffList
          staff={staffMembers}
          onEdit={handleOpenEditForm}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDeleteStaff}
        />
      )}

      {/* Form Container with ref */}
      <div ref={formRef}>
        {showForm && (
          <StaffForm
            initialData={editingStaff || {}}
            onSubmit={handleFormSubmit}
            isEditing={!!editingStaff}
            onCancel={handleCloseForm}
            resetTrigger={resetTrigger}
            submitButtonText={
              submitting
                ? t("manageMenu.submitting")
                : editingStaff
                ? t("manageStaff.update")
                : t("manageStaff.create")
            }
            isSubmitting={submitting}
          />
        )}
      </div>
    </div>
  );
}
