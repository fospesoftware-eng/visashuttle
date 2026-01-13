import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Upload, Camera, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Tenant, Case } from "@shared/schema";

const docTypes = [
  { value: "passport", label: "Passport" },
  { value: "photo", label: "Photo" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "employment_letter", label: "Employment Letter" },
  { value: "itinerary", label: "Travel Itinerary" },
  { value: "accommodation", label: "Hotel Booking" },
  { value: "insurance", label: "Travel Insurance" },
  { value: "other", label: "Other Document" },
];

export default function WhiteLabelUploadsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [docType, setDocType] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const caseIdParam = params.get("caseId");
    const docTypeParam = params.get("docType");
    if (caseIdParam) setSelectedCaseId(caseIdParam);
    if (docTypeParam) setDocType(docTypeParam);
  }, []);

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ["/api/w", slug, "tenant"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/tenant`);
      if (!res.ok) throw new Error("Agency not found");
      return res.json();
    }
  });

  // Check auth status
  const { data: authData, isLoading: authLoading } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/w", slug, "auth/me"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/auth/me`, { credentials: "include" });
      if (!res.ok) return { authenticated: false };
      return res.json();
    }
  });

  if (!authLoading && !authData?.authenticated) {
    setLocation(`/w/${slug}/login`);
    return null;
  }

  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ["/api/w", slug, "portal/cases"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/portal/cases`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!authData?.authenticated
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCaseId || !docType || !uploadedFile) {
        throw new Error("Please select a case, document type, and file");
      }
      return apiRequest("POST", `/api/w/${slug}/portal/cases/${selectedCaseId}/documents`, {
        name: uploadedFile.name,
        type: docType
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Document uploaded successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/w", slug, "portal/cases", selectedCaseId, "documents"] });
      setUploadedFile(null);
      setDocType("");
    },
    onError: (error: Error) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    }
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b px-4 py-3 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setLocation(`/w/${slug}/portal`)}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold">Upload Document</h1>
      </header>

      <main className="flex-1 p-4 max-w-xl mx-auto w-full space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Case & Document Type</CardTitle>
            <CardDescription>Choose which case and document type you're uploading</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Case</Label>
              <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                <SelectTrigger data-testid="select-case">
                  <SelectValue placeholder="Select a case" />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.referenceId} - {c.visaType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger data-testid="select-doc-type">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {docTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload File</CardTitle>
            <CardDescription>Drag and drop or click to select a file</CardDescription>
          </CardHeader>
          <CardContent>
            {uploadedFile ? (
              <div className="border rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setUploadedFile(null)}
                  data-testid="button-remove-file"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">
                  Drag and drop your file here, or
                </p>
                <label>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    data-testid="input-file"
                  />
                  <Button variant="outline" className="gap-2" asChild>
                    <span>
                      <Camera className="w-4 h-4" />
                      Select File
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground mt-4">
                  Supported: PDF, JPG, PNG (max 10MB)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Button 
          className="w-full"
          style={{ backgroundColor: tenant.primaryColor || undefined }}
          disabled={!selectedCaseId || !docType || !uploadedFile || uploadMutation.isPending}
          onClick={() => uploadMutation.mutate()}
          data-testid="button-upload"
        >
          {uploadMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </>
          )}
        </Button>
      </main>

      {tenant.showPoweredBy && (
        <div className="py-2 text-center text-xs text-muted-foreground border-t">
          Powered by <span className="font-medium gradient-text">Visa Shuttle</span>
        </div>
      )}
    </div>
  );
}
