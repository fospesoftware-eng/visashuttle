import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Filter, MoreVertical, ArrowUpDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { ProgressRing } from "@/components/progress-ring";

const cases = [
  { id: "VS-2024-001", applicant: "John Smith", email: "john@email.com", visaType: "Schengen Tourist", country: "France", status: "in_progress", readiness: 75, createdAt: "2024-01-15" },
  { id: "VS-2024-002", applicant: "Sarah Johnson", email: "sarah@email.com", visaType: "UK Visitor", country: "United Kingdom", status: "documents_required", readiness: 45, createdAt: "2024-01-14" },
  { id: "VS-2024-003", applicant: "Michael Brown", email: "michael@email.com", visaType: "UAE Tourist", country: "UAE", status: "under_review", readiness: 90, createdAt: "2024-01-13" },
  { id: "VS-2024-004", applicant: "Emily Davis", email: "emily@email.com", visaType: "US B1/B2", country: "United States", status: "pending", readiness: 20, createdAt: "2024-01-12" },
  { id: "VS-2024-005", applicant: "James Wilson", email: "james@email.com", visaType: "Canada Visitor", country: "Canada", status: "approved", readiness: 100, createdAt: "2024-01-10" },
  { id: "VS-2024-006", applicant: "Lisa Anderson", email: "lisa@email.com", visaType: "Australia ETA", country: "Australia", status: "in_progress", readiness: 60, createdAt: "2024-01-08" },
];

export default function CasesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.applicant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Applications</h1>
            <p className="text-muted-foreground">Manage all visa applications and their progress.</p>
          </div>
          <Link href="/app/cases/new">
            <Button className="gap-2" data-testid="button-new-case">
              <Plus className="w-4 h-4" />
              New Application
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, application ID, or email..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-cases"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="documents_required">Documents Required</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">
                    <Button variant="ghost" size="sm" className="gap-1 -ml-3">
                      Case ID
                      <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Visa Type</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Readiness</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((caseItem) => (
                  <TableRow key={caseItem.id} data-testid={`case-row-${caseItem.id}`}>
                    <TableCell className="font-medium">
                      <Link href={`/app/cases/${caseItem.id}`}>
                        <a className="text-primary hover:underline">{caseItem.id}</a>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{caseItem.applicant}</p>
                        <p className="text-sm text-muted-foreground">{caseItem.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{caseItem.visaType}</TableCell>
                    <TableCell>{caseItem.country}</TableCell>
                    <TableCell>
                      <StatusBadge status={caseItem.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <ProgressRing value={caseItem.readiness} size={40} strokeWidth={3} />
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{caseItem.createdAt}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-case-actions-${caseItem.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/app/cases/${caseItem.id}`}>
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem>Edit Case</DropdownMenuItem>
                          <DropdownMenuItem>Send Reminder</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Cancel Case</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredCases.length} of {cases.length} cases
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm">Next</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
