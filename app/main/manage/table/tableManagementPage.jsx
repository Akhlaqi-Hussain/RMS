"use client";
import { useEffect, useState, useRef } from "react";
import TableList from "./tableList";
import TableForm from "./tableForm";
import toast from "react-hot-toast";
import { useLanguage } from "@/context/LanguageContext";

export default function TableManagementPage() {
  const { t } = useLanguage();
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

  // LINT-1: first load. The list is filled in when the answer arrives
  // (no state change directly inside the effect); fetchTables() is still used to refresh.
  useEffect(() => {
    let active = true;
    fetch("/api/tables", { method: "GET", cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch tables");
        return res.json();
      })
      .then((data) => {
        if (active) {setTables(data);}
      })
      .catch((err) => {
        console.error("Error fetching tables:", err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
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
        editingTable ? t("server.tableUpdated") : t("manageTables.added")
      );

      await fetchTables(); // refresh list
      handleCloseForm();
    } catch (err) {
      console.error("Error saving table:", err);
      toast.error(t("manageTables.saveFailed"));
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

      toast.success(newStatus ? t("server.tableActivated") : t("server.tableDeactivated"));
      await fetchTables(); // refresh list
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error(t("server.statusUpdateFailed"));
    }
  }

  // Handle delete table - CORRECT: Using DELETE method
  async function handleDeleteTable(tableId) {
    if (!confirm(t("manageTables.deleteConfirm"))) {
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

      toast.success(t("server.tableDeleted"));
      await fetchTables(); // refresh list
    } catch (err) {
      console.error("Error deleting table:", err);
      toast.error(t("server.tableDeleteFailed"));
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
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h2 className="text-xl font-bold">{t("manageTables.title")}</h2>
        <button
          onClick={handleOpenAddForm}
          disabled={submitting}
          className="bg-[color:var(--color-primary)] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity duration-200 disabled:opacity-50"
        >
          {submitting ? t("manageMenu.submitting") : t("manageTables.addNew")}
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
                ? t("manageMenu.submitting")
                : editingTable
                ? t("manageTables.update")
                : t("manageTables.create")
            }
            isSubmitting={submitting}
          />
        )}
      </div>
    </div>
  );
}
