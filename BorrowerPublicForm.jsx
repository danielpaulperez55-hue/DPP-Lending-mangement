import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check } from "lucide-react";

export default function BorrowerPublicForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    occupation: "",
    monthly_income: "",
    civil_status: "single",
    emergency_contact_name: "",
    emergency_contact_number: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone) {
      toast.error("Name and phone are required");
      return;
    }

    setLoading(true);
    try {
      const count = await base44.entities.Borrower.list();
      const borrowerId = `BRW-${String(count.length + 1).padStart(5, "0")}`;

      await base44.entities.Borrower.create({
        borrower_id: borrowerId,
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email || undefined,
        address: formData.address || undefined,
        occupation: formData.occupation || undefined,
        monthly_income: formData.monthly_income ? Number(formData.monthly_income) : undefined,
        civil_status: formData.civil_status,
        emergency_contact_name: formData.emergency_contact_name || undefined,
        emergency_contact_number: formData.emergency_contact_number || undefined,
        status: "active",
      });

      setSubmitted(true);
      toast.success("Registration successful!");
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Success!</h1>
          <p className="text-slate-600">Your borrower registration has been submitted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto pt-6">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Borrower Registration</h1>
          <p className="text-slate-600 mb-8">Please fill in your details below</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Full Name *
              </label>
              <Input
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Your full name"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Phone Number *
                </label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="09XXXXXXXXX"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email
                </label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Address
              </label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Occupation
                </label>
                <Input
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleChange}
                  placeholder="Job or occupation"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Monthly Income
                </label>
                <Input
                  name="monthly_income"
                  type="number"
                  value={formData.monthly_income}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Civil Status
              </label>
              <select
                name="civil_status"
                value={formData.civil_status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="widowed">Widowed</option>
                <option value="separated">Separated</option>
              </select>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Contact Name
                  </label>
                  <Input
                    name="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={handleChange}
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Contact Number
                  </label>
                  <Input
                    name="emergency_contact_number"
                    value={formData.emergency_contact_number}
                    onChange={handleChange}
                    placeholder="09XXXXXXXXX"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-6 h-10 bg-primary text-primary-foreground"
            >
              {loading ? "Registering..." : "Submit Registration"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}