import { useState } from "react";
import { Plus, Search, Globe, FileText, Edit, Eye, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const visaTemplates = [
  { id: "1", country: "France", visaType: "Schengen Tourist", version: 5, lastUpdated: "2024-01-10", documents: 8, isActive: true },
  { id: "2", country: "United Kingdom", visaType: "Visitor Visa", version: 3, lastUpdated: "2024-01-08", documents: 10, isActive: true },
  { id: "3", country: "United States", visaType: "B1/B2 Visitor", version: 4, lastUpdated: "2024-01-05", documents: 12, isActive: true },
  { id: "4", country: "Canada", visaType: "Visitor Visa", version: 2, lastUpdated: "2024-01-03", documents: 9, isActive: true },
  { id: "5", country: "Australia", visaType: "ETA", version: 2, lastUpdated: "2023-12-20", documents: 5, isActive: true },
  { id: "6", country: "UAE", visaType: "Tourist Visa", version: 3, lastUpdated: "2023-12-15", documents: 6, isActive: true },
];

const updateProposals = [
  { id: "1", country: "France", visaType: "Schengen Tourist", source: "Embassy Website", proposedChanges: 3, createdAt: "2024-01-12", status: "pending" },
  { id: "2", country: "United States", visaType: "B1/B2 Visitor", source: "State Dept", proposedChanges: 2, createdAt: "2024-01-11", status: "pending" },
  { id: "3", country: "Canada", visaType: "Visitor Visa", source: "IRCC Portal", proposedChanges: 1, createdAt: "2024-01-10", status: "pending" },
];

export default function AdminVKBPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");

  const filteredTemplates = visaTemplates.filter(t => {
    const matchesSearch = t.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.visaType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = countryFilter === "all" || t.country === countryFilter;
    return matchesSearch && matchesCountry;
  });

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Visa Knowledge Base</h1>
            <p className="text-muted-foreground">Manage visa templates and requirements.</p>
          </div>
          <Button className="gap-2" data-testid="button-add-template">
            <Plus className="w-4 h-4" />
            Add Template
          </Button>
        </div>

        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
            <TabsTrigger value="updates" data-testid="tab-updates">
              Update Proposals
              {updateProposals.length > 0 && (
                <Badge variant="secondary" className="ml-2">{updateProposals.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-templates"
                />
              </div>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-country-filter">
                  <SelectValue placeholder="Filter by country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  <SelectItem value="France">France</SelectItem>
                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                  <SelectItem value="United States">United States</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                  <SelectItem value="UAE">UAE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover-elevate" data-testid={`template-card-${template.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Globe className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{template.country}</p>
                          <p className="text-sm text-muted-foreground">{template.visaType}</p>
                        </div>
                      </div>
                      <Badge variant="outline">v{template.version}</Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Documents Required</span>
                        <span className="font-medium text-foreground">{template.documents}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Last Updated</span>
                        <span>{template.lastUpdated}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="flex-1 gap-1">
                        <Eye className="w-3 h-3" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-1">
                        <Edit className="w-3 h-3" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="updates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending Update Proposals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {updateProposals.map((proposal) => (
                  <div 
                    key={proposal.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate cursor-pointer"
                    data-testid={`proposal-${proposal.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="font-medium">{proposal.country} - {proposal.visaType}</p>
                        <p className="text-sm text-muted-foreground">Source: {proposal.source}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium">{proposal.proposedChanges} changes</p>
                        <p className="text-xs text-muted-foreground">{proposal.createdAt}</p>
                      </div>
                      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                        Pending Review
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}

                {updateProposals.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending update proposals
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
