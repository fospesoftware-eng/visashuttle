import { useState } from "react";
import { Search, Filter, Grid, List, FileText, Download, Eye, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { UploadDropzone } from "@/components/upload-dropzone";

const documents = [
  { id: "1", name: "John Smith - Passport", caseId: "VS-2024-001", type: "passport", status: "approved", qualityScore: 95, uploadedAt: "2024-01-15" },
  { id: "2", name: "John Smith - Photo", caseId: "VS-2024-001", type: "photo", status: "approved", qualityScore: 88, uploadedAt: "2024-01-15" },
  { id: "3", name: "Sarah Johnson - Passport", caseId: "VS-2024-002", type: "passport", status: "pending", qualityScore: null, uploadedAt: "2024-01-14" },
  { id: "4", name: "Sarah Johnson - Bank Statement", caseId: "VS-2024-002", type: "bank_statement", status: "needs_reupload", qualityScore: 30, uploadedAt: "2024-01-14" },
  { id: "5", name: "Michael Brown - Passport", caseId: "VS-2024-003", type: "passport", status: "approved", qualityScore: 92, uploadedAt: "2024-01-13" },
  { id: "6", name: "Michael Brown - Employment Letter", caseId: "VS-2024-003", type: "employment", status: "pending", qualityScore: null, uploadedAt: "2024-01-13" },
  { id: "7", name: "Emily Davis - Passport", caseId: "VS-2024-004", type: "passport", status: "pending", qualityScore: null, uploadedAt: "2024-01-12" },
  { id: "8", name: "James Wilson - Travel Insurance", caseId: "VS-2024-005", type: "insurance", status: "approved", qualityScore: 100, uploadedAt: "2024-01-10" },
];

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.caseId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    const matchesType = typeFilter === "all" || doc.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getQualityColor = (score: number | null) => {
    if (score === null) return "bg-muted";
    if (score >= 80) return "bg-emerald-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Document Center</h1>
            <p className="text-muted-foreground">Manage and review all uploaded documents.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <UploadDropzone onUpload={(files) => console.log(files)} />
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-documents"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="needs_reupload">Needs Reupload</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-type-filter">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="passport">Passport</SelectItem>
              <SelectItem value="photo">Photo</SelectItem>
              <SelectItem value="bank_statement">Bank Statement</SelectItem>
              <SelectItem value="employment">Employment</SelectItem>
              <SelectItem value="insurance">Insurance</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button 
              variant={viewMode === "grid" ? "secondary" : "ghost"} 
              size="icon"
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === "list" ? "secondary" : "ghost"} 
              size="icon"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="hover-elevate" data-testid={`document-card-${doc.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.caseId}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground capitalize">{doc.type.replace('_', ' ')}</span>
                    <StatusBadge status={doc.status} />
                  </div>

                  {doc.qualityScore !== null && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Quality Score</span>
                        <span className="font-medium">{doc.qualityScore}%</span>
                      </div>
                      <Progress value={doc.qualityScore} className="h-1.5" />
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-3">
                    Uploaded {doc.uploadedAt}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredDocuments.map((doc) => (
                  <div 
                    key={doc.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50"
                    data-testid={`document-row-${doc.id}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.name}</p>
                      <p className="text-sm text-muted-foreground">{doc.caseId} • {doc.type.replace('_', ' ')}</p>
                    </div>
                    <StatusBadge status={doc.status} />
                    {doc.qualityScore !== null && (
                      <div className="w-24 hidden sm:block">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Quality</span>
                          <span>{doc.qualityScore}%</span>
                        </div>
                        <Progress value={doc.qualityScore} className="h-1.5" />
                      </div>
                    )}
                    <span className="text-sm text-muted-foreground hidden md:block">{doc.uploadedAt}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredDocuments.length} of {documents.length} documents
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
