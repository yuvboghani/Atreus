'use client';

import { useState } from 'react';
import { updateProfile } from "@/app/actions/update-profile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DatabaseIcon, SaveIcon, UploadCloudIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProfileFormProps {
    defaultResume: string;
    defaultSkills: string;
    skillBank: string[]; // for display badges
}

export function ProfileForm({ defaultResume, defaultSkills, skillBank }: ProfileFormProps) {
    const [resumeText, setResumeText] = useState(defaultResume);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch('/api/ingest/resume', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.text) {
                setResumeText(data.text);
            } else {
                console.error("No text returned", data);
            }
        } catch (err) {
            console.error("Upload failed", err);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <form action={updateProfile} className="space-y-8 flex-1">

            {/* SECTION 1: MASTER RESUME */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <DatabaseIcon className="w-5 h-5" />
                        <h2 className="text-xl font-bold uppercase">Master Resume Data</h2>
                    </div>
                    <div className="relative">
                        <Button
                            type="button"
                            variant="outline"
                            className="border-black text-xs font-bold uppercase hover:bg-black hover:text-white transition-none"
                            disabled={isUploading}
                        >
                            {isUploading ? "EXTRACTING..." : <><UploadCloudIcon className="mr-2 w-4 h-4" /> UPLOAD PDF</>}
                        </Button>
                        <input
                            type="file"
                            accept="application/pdf"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                        />
                    </div>
                </div>
                <div className="relative">
                    <div className="absolute -top-3 left-4 bg-background px-2 font-mono text-xs font-bold border-2 border-black border-b-0 shadow-none z-10 w-fit">
                        PASTE RAW TEXT
                    </div>
                    <Textarea
                        name="resume"
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        className="h-96 font-mono text-xs p-6 leading-relaxed"
                        placeholder="Paste the full text content of your master resume here..."
                    />
                </div>
            </div>

            {/* SECTION 2: SKILL BANK */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-black flex items-center justify-center font-bold text-xs">#</div>
                    <h2 className="text-xl font-bold uppercase">Skill Bank</h2>
                </div>
                <div className="relative">
                    <div className="absolute -top-3 left-4 bg-background px-2 font-mono text-xs font-bold border-2 border-black border-b-0 shadow-none z-10 w-fit">
                        COMMA SEPARATED
                    </div>
                    <Textarea
                        name="skills"
                        defaultValue={defaultSkills}
                        className="h-24 font-mono text-sm p-6"
                        placeholder="React, TypeScript, Next.js, Postgres, ..."
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {skillBank.map((skill: string) => (
                        <Badge key={skill} variant="outline" className="border-black">{skill}</Badge>
                    ))}
                </div>
            </div>

            {/* ACTION BAR */}
            <div className="sticky bottom-8 flex justify-end">
                <Button type="submit" className="h-14 px-8 text-lg font-mono tracking-widest bg-black text-white hover:bg-black/80 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <SaveIcon className="mr-2 h-5 w-5" /> SAVE ASSETS
                </Button>
            </div>

        </form>
    );
}
