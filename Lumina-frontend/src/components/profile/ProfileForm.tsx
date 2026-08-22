"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User } from "@/types/user";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUpdateProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CheckCircle2, Plus, Trash2, ChevronDown, ChevronUp, Edit2, Save, X } from "lucide-react";

// --- Form Validation Schema ---
const educationSchema = z.object({
    type: z.string().optional(),
    institution: z.string().optional(),
    degree: z.string().optional(),
    specialization: z.string().optional(),
    startYear: z.string().optional(),
    endYear: z.string().optional(),
});

const profileFormSchema = z.object({
    full_name: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    bio: z.string().max(300).optional(),
    avatar_url: z.string().url().optional().or(z.literal("")),
    dob: z.string().optional(),
    profession: z.string().optional(),
    education_records: z.array(educationSchema).optional(),
    contact_info: z.object({
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        pincode: z.string().optional(),
        primary_mobile: z.string().optional(),
        secondary_mobile: z.string().optional(),
    }).optional(),
}).superRefine((data, ctx) => {
    if (data.dob && data.dob.trim() !== "") {
        const birthDate = new Date(data.dob);
        if (!isNaN(birthDate.getTime())) {
            const currentYear = new Date().getFullYear();
            const birthYear = birthDate.getFullYear();
            const age = currentYear - birthYear;

            const profession = data.profession || "";
            let minAge = 5;

            if (profession === "Student") {
                minAge = 5;
            } else if (
                profession === "Working Professional" ||
                profession === "Self-Employed" ||
                profession === "Self-employed" ||
                profession === "Business Owner"
            ) {
                minAge = 15;
            } else if (profession === "Other") {
                minAge = 5;
            } else {
                minAge = 5;
            }

            if (age < minAge) {
                const message = profession
                    ? `${profession} age cannot be less than ${minAge} years.`
                    : `Age cannot be less than ${minAge} years.`;
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: message,
                    path: ["dob"],
                });
            }
        }
    }
    if (data.contact_info) {
        const primary = data.contact_info.primary_mobile?.trim();
        const secondary = data.contact_info.secondary_mobile?.trim();
        if (primary && secondary && primary === secondary) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Secondary mobile number cannot be the same as primary mobile number.",
                path: ["contact_info", "secondary_mobile"],
            });
        }
    }
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function InfoItem({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
            <span className="block text-sm text-slate-900 dark:text-slate-100 font-medium">
                {value || <span className="text-slate-400 italic">Not provided</span>}
            </span>
        </div>
    );
}

export default function ProfileForm({ user }: { user: User }) {
    const { refreshUser } = useAuth();
    const { mutate: updateProfile, isPending, isSuccess } = useUpdateProfile();
    
    const [isEditMode, setIsEditMode] = useState(false);

    // Accordion states
    const [expandedSections, setExpandedSections] = useState({
        basic: true,
        education: false,
        contact: false
    });

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const {
        register,
        control,
        handleSubmit,
        watch,
        reset,
        formState: { isDirty, errors, isValid }
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        mode: "onChange",
        defaultValues: {
            full_name: user.full_name || "",
            email: user.email || "",
            bio: user.bio || "",
            avatar_url: user.avatar_url || "",
            dob: user.dob || "",
            profession: user.profession || "",
            education_records: user.education_records?.length ? user.education_records : [],
            contact_info: user.contact_info || {
                address: "", city: "", state: "", country: "", pincode: "", primary_mobile: "", secondary_mobile: ""
            }
        }
    });

    useEffect(() => {
        if (user) {
            reset({
                full_name: user.full_name || "",
                email: user.email || "",
                bio: user.bio || "",
                avatar_url: user.avatar_url || "",
                dob: user.dob || "",
                profession: user.profession || "",
                education_records: user.education_records?.length ? user.education_records : [],
                contact_info: user.contact_info || {
                    address: "", city: "", state: "", country: "", pincode: "", primary_mobile: "", secondary_mobile: ""
                }
            });
        }
    }, [user, reset]);

    const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({
        control,
        name: "education_records"
    });

    const watchAllFields = watch();

    const canAddEducation = useMemo(() => {
        if (!watchAllFields.education_records || watchAllFields.education_records.length === 0) return true;
        const last = watchAllFields.education_records[watchAllFields.education_records.length - 1];
        return !!(last.institution && last.degree && last.specialization && last.startYear && last.endYear);
    }, [watchAllFields.education_records]);

    // Compute completion percentage
    const completionPercentage = useMemo(() => {
        const fieldsToCheck = [
            watchAllFields.full_name, watchAllFields.email, watchAllFields.bio,
            watchAllFields.dob, watchAllFields.profession,
            watchAllFields.contact_info?.primary_mobile,
            watchAllFields.contact_info?.city
        ];
        
        let filled = 0;
        fieldsToCheck.forEach(val => {
            if (val && val.toString().trim() !== "") filled++;
        });
        
        return Math.round((filled / fieldsToCheck.length) * 100);
    }, [watchAllFields]);

    const onSubmit = (data: ProfileFormValues) => {
        const processedData = {
            ...data,
            avatar_url: data.avatar_url || user.avatar_url || "",
            profile_completed: completionPercentage >= 80
        };
        
        updateProfile(processedData, {
            onSuccess: () => {
                refreshUser();
                setIsEditMode(false);
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header / Completion Status */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-6 flex items-center justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                        <h2 className="text-lg font-bold text-indigo-900 dark:text-indigo-300">Profile {completionPercentage}% Complete</h2>
                    </div>
                    <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-1 max-w-md">
                        Complete your profile to unlock better personalized book recommendations and AI experiences.
                    </p>
                </div>
                <div className="relative w-16 h-16 ml-4">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-indigo-200 dark:text-indigo-900/50" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                        <path className="text-indigo-600 dark:text-indigo-400" strokeDasharray={`${completionPercentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-indigo-900 dark:text-indigo-300">
                        {completionPercentage}%
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">Account Details</h3>
                        <p className="text-xs text-slate-500">Manage your personal and contact information.</p>
                    </div>
                    {!isEditMode && (
                        <Button type="button" onClick={() => setIsEditMode(true)} variant="outline" size="sm" className="gap-2">
                            <Edit2 className="w-4 h-4" /> Edit Details
                        </Button>
                    )}
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
                    
                    {/* Basic Profile */}
                    <div className="space-y-4">
                        <button type="button" onClick={() => toggleSection("basic")} className="w-full flex items-center justify-between transition-colors">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 w-full text-left flex justify-between">
                                Basic Profile
                                {expandedSections.basic ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </h4>
                        </button>
                        {expandedSections.basic && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                {!isEditMode ? (
                                    <>
                                        <InfoItem label="Full Name" value={user.full_name} />
                                        <InfoItem label="Email" value={user.email} />
                                        <div className="md:col-span-2">
                                            <InfoItem label="Bio" value={user.bio} />
                                        </div>
                                        <InfoItem label="Date of Birth" value={user.dob} />
                                        <InfoItem label="Profession" value={user.profession} />
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                                            <Input {...register("full_name")} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                            <Input {...register("email")} type="email" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bio</label>
                                            <textarea {...register("bio")} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300" rows={3} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
                                            <Input {...register("dob")} type="date" />
                                            {errors.dob && (
                                                <p className="text-xs text-red-500 font-medium mt-1">{errors.dob.message}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Profession</label>
                                            <select {...register("profession")} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300">
                                                <option value="">Select...</option>
                                                <option value="Student">Student</option>
                                                <option value="Working Professional">Working Professional</option>
                                                <option value="Self-Employed">Self-Employed</option>
                                                <option value="Business Owner">Business Owner</option>
                                                <option value="Other">Other</option>
                                            </select>
                                            {errors.profession && (
                                                <p className="text-xs text-red-500 font-medium mt-1">{errors.profession.message}</p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Education Profile */}
                    <div className="space-y-4">
                        <button type="button" onClick={() => toggleSection("education")} className="w-full flex items-center justify-between transition-colors">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 w-full text-left flex justify-between">
                                Education Profile
                                {expandedSections.education ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </h4>
                        </button>
                        {expandedSections.education && (
                            <div className="space-y-4 pt-2">
                                {!isEditMode ? (
                                    user.education_records && user.education_records.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-4">
                                            {user.education_records.map((edu, idx) => (
                                                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <h5 className="font-bold text-slate-900 dark:text-slate-100">{edu.degree} in {edu.specialization}</h5>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">{edu.institution}</p>
                                                    <p className="text-xs text-slate-500 mt-1">{edu.startYear} - {edu.endYear}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500 italic">No education records added.</p>
                                    )
                                ) : (
                                    <>
                                        {eduFields.map((field, index) => (
                                            <div key={field.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg relative">
                                                <button type="button" onClick={() => removeEdu(index)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">Institution</label>
                                                        <Input {...register(`education_records.${index}.institution` as const)} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">Degree/Qualification</label>
                                                        <Input {...register(`education_records.${index}.degree` as const)} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">Specialization</label>
                                                        <Input {...register(`education_records.${index}.specialization` as const)} />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="block text-xs font-medium text-slate-500 mb-1">Start Year</label>
                                                            <Input {...register(`education_records.${index}.startYear` as const)} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="block text-xs font-medium text-slate-500 mb-1">End Year</label>
                                                            <Input {...register(`education_records.${index}.endYear` as const)} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm" 
                                            disabled={!canAddEducation}
                                            onClick={() => appendEdu({ institution: "", degree: "", specialization: "", startYear: "", endYear: "" })}
                                        >
                                            <Plus className="h-4 w-4 mr-2" /> Add Education
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-4">
                        <button type="button" onClick={() => toggleSection("contact")} className="w-full flex items-center justify-between transition-colors">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 w-full text-left flex justify-between">
                                Contact Information
                                {expandedSections.contact ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </h4>
                        </button>
                        {expandedSections.contact && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                {!isEditMode ? (
                                    <>
                                        <div className="md:col-span-2">
                                            <InfoItem label="Address / Street" value={user.contact_info?.address} />
                                        </div>
                                        <InfoItem label="City" value={user.contact_info?.city} />
                                        <InfoItem label="State" value={user.contact_info?.state} />
                                        <InfoItem label="Country" value={user.contact_info?.country} />
                                        <InfoItem label="Pincode" value={user.contact_info?.pincode} />
                                        <InfoItem label="Primary Mobile" value={user.contact_info?.primary_mobile} />
                                        <InfoItem label="Secondary Mobile" value={user.contact_info?.secondary_mobile} />
                                    </>
                                ) : (
                                    <>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address / Street</label>
                                            <Input {...register("contact_info.address")} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">City</label>
                                            <Input {...register("contact_info.city")} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">State</label>
                                            <Input {...register("contact_info.state")} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Country</label>
                                            <Input {...register("contact_info.country")} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pincode</label>
                                            <Input {...register("contact_info.pincode")} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Primary Mobile</label>
                                            <Input {...register("contact_info.primary_mobile")} />
                                            {errors.contact_info?.primary_mobile && (
                                                <p className="text-xs text-red-500 font-medium mt-1">{errors.contact_info.primary_mobile.message}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Secondary Mobile</label>
                                            <Input {...register("contact_info.secondary_mobile")} />
                                            {errors.contact_info?.secondary_mobile && (
                                                <p className="text-xs text-red-500 font-medium mt-1">{errors.contact_info.secondary_mobile.message}</p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {isSuccess && (
                        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg flex items-center text-sm border border-emerald-200">
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Profile saved successfully.
                        </div>
                    )}

                    {isEditMode && (
                        <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => { reset(); setIsEditMode(false); }} className="w-full sm:w-auto gap-2">
                                <X className="h-4 w-4" /> Cancel
                            </Button>
                            <Button type="submit" disabled={isPending || !isDirty || !isValid} className="w-full sm:w-auto gap-2">
                                {isPending ? (
                                    <>
                                        <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" /> Save Details
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
