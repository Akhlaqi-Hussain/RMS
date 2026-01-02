"use client";
import { useEffect, useState, useRef } from "react";
import TableList from "./tableList";
import TableForm from "./tableForm";
import toast from "react-hot-toast";

export default function TableManagementPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // modal/form control
  const [showForm, setShowForm] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Ref for the form container
  const formRef = useRef(null);

  // Fetch tables from API
  async function fetchTables() {
    try {
      const res = await fetch("/api/tables", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch tables");
      const data = await res.json();
      setTables(data);
    } catch (err) {
      console.error("Error fetching tables:", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTables();
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
      let url = "/api/tables";
      let method = "POST";

      if (editingTable) {
        // editing mode - use the PUT API
        url = `/api/tables/${editingTable.table_id}`;
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
        throw new Error(errorData.error || "Failed to save table");
      }

      const result = await res.json();

      // Show success message
      toast.success(
        editingTable ? "میز با موفقیت ویرایش شد" : "میز با موفقیت اضافه شد"
      );

      await fetchTables(); // refresh list
      handleCloseForm();
    } catch (err) {
      console.error("Error saving table:", err);
      toast.error(`خطا در ذخیره میز`);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle status toggle - FIXED: Use PATCH method
  async function handleToggleStatus(tableId, currentStatus) {
    try {
      const newStatus = !currentStatus;

      const res = await fetch(`/api/tables/${tableId}`, {
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

      toast.success(newStatus ? "میز فعال شد" : "میز غیرفعال شد");
      await fetchTables(); // refresh list
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("خطا در تغییر وضعیت میز");
    }
  }

  // Handle delete table - CORRECT: Using DELETE method
  async function handleDeleteTable(tableId) {
    if (!confirm("آیا از حذف این میز اطمینان دارید؟")) {
      return;
    }

    try {
      const res = await fetch(`/api/tables/${tableId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete table");
      }

      toast.success("میز با موفقیت حذف شد");
      await fetchTables(); // refresh list
    } catch (err) {
      console.error("Error deleting table:", err);
      toast.error("خطا در حذف میز");
    }
  }

  function handleOpenAddForm() {
    setEditingTable(null);
    setShowForm(true);
    setResetTrigger((prev) => prev + 1);

    setTimeout(() => {
      scrollToForm();
    }, 50);
  }

  function handleOpenEditForm(table) {
    setEditingTable(table);
    setShowForm(true);
    setResetTrigger((prev) => prev + 1);

    setTimeout(() => {
      scrollToForm();
    }, 50);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingTable(null);
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">مدیریت میزها</h2>
        <button
          onClick={handleOpenAddForm}
          disabled={submitting}
          className="bg-[color:var(--color-primary)] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity duration-200 disabled:opacity-50"
        >
          {submitting ? "در حال ثبت..." : "افزودن میز جدید"}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--color-primary)]"></div>
        </div>
      ) : (
        <TableList
          tables={tables}
          onEdit={handleOpenEditForm}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDeleteTable}
        />
      )}

      {/* Form Container with ref */}
      <div ref={formRef}>
        {showForm && (
          <TableForm
            initialData={editingTable || {}}
            onSubmit={handleFormSubmit}
            isEditing={!!editingTable}
            onCancel={handleCloseForm}
            resetTrigger={resetTrigger}
            submitButtonText={
              submitting
                ? "در حال ثبت..."
                : editingTable
                ? "ویرایش میز"
                : "ثبت میز"
            }
            isSubmitting={submitting}
          />
        )}
      </div>
    </div>
  );
}
