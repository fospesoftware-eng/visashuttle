import { CheckCircle, AlertCircle, Clock, FileText, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CustomerLayout } from "@/components/layouts/customer-layout";
import { StatusBadge } from "@/components/status-badge";
import { UploadDropzone } from "@/components/upload-dropzone";

const documents = [
  { id: "1", name: "Passport Scan", type: "passport", status: "approved", qualityScore: 95, feedback: "Excellent quality" },
  { id: "2", name: "Photo", type: "photo", status: "approved", qualityScore: 88, feedback: "Meets requirements" },
  { id: "3", name: "Bank Statement", type: "bank_statement", status: "pending", qualityScore: null, feedback: null },
  { id: "4", name: "Flight Itinerary", type: "itinerary", status: "needs_reupload", qualityScore: 30, feedback: "Document is blurry. Please upload a clearer version." },
  { id: "5", name: "Hotel Booking", type: "accommodation", status: "pending", qualityScore: null, feedback: null },
  { id: "6", name: "Travel Insurance", type: "insurance", status: "pending", qualityScore: null, feedback: null },
  { id: "7", name: "Employment Letter", type: "employment", status: "pending", qualityScore: null, feedback: null },
];

export default function CustomerUploadPage() {
  const approvedCount = documents.filter(d => d.status === "approved").length;
  const pendingCount = documents.filter(d => d.status === "pending").length;
  const needsReuploadCount = documents.filter(d => d.status === "needs_reupload").length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "needs_reupload":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Upload Documents</h1>
          <p className="text-muted-foreground">Upload the required documents for your visa application.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{approvedCount}</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{pendingCount}</p>
                <p className="text-sm text-amber-600 dark:text-amber-400">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{needsReuploadCount}</p>
                <p className="text-sm text-red-600 dark:text-red-400">Needs Reupload</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload New Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <UploadDropzone 
              onUpload={(files) => console.log("Uploaded:", files)}
              accept=".pdf,.jpg,.jpeg,.png"
              maxSize={10 * 1024 * 1024}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`p-4 rounded-lg border ${
                  doc.status === "needs_reupload" 
                    ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20" 
                    : doc.status === "approved"
                    ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20"
                    : "bg-muted/30"
                }`}
                data-testid={`document-${doc.id}`}
              >
                <div className="flex items-start gap-4">
                  {getStatusIcon(doc.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium">{doc.name}</span>
                      <StatusBadge status={doc.status} />
                    </div>
                    <p className="text-xs text-muted-foreground capitalize mb-2">
                      {doc.type.replace("_", " ")}
                    </p>
                    
                    {doc.qualityScore !== null && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Quality Score</span>
                          <span className={`font-medium ${
                            doc.qualityScore >= 80 ? "text-emerald-600" : 
                            doc.qualityScore >= 50 ? "text-amber-600" : "text-red-600"
                          }`}>
                            {doc.qualityScore}%
                          </span>
                        </div>
                        <Progress value={doc.qualityScore} className="h-1.5" />
                      </div>
                    )}
                    
                    {doc.feedback && (
                      <p className={`text-sm ${
                        doc.status === "needs_reupload" 
                          ? "text-red-600 dark:text-red-400" 
                          : "text-muted-foreground"
                      }`}>
                        {doc.feedback}
                      </p>
                    )}

                    <div className="flex gap-2 mt-3">
                      {doc.status === "approved" && (
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                      )}
                      {doc.status === "needs_reupload" && (
                        <Button size="sm" className="gap-1" data-testid={`button-reupload-${doc.id}`}>
                          <RefreshCw className="w-3 h-3" />
                          Re-upload
                        </Button>
                      )}
                      {doc.status === "pending" && (
                        <Button variant="outline" size="sm" className="gap-1" data-testid={`button-upload-${doc.id}`}>
                          <FileText className="w-3 h-3" />
                          Upload
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}
