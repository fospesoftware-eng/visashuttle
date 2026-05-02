import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar as CalendarIcon, MapPin, Plus, Trash2, Pencil, Upload, FileCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import {
  APPOINTMENT_TYPES, APPOINTMENT_STATUSES,
  type Appointment, type AppointmentType, type AppointmentStatus,
} from "@shared/schema";
import { EMBASSIES_BY_COUNTRY, VFS_BLS_CITIES, suggestEmbassies } from "@/data/appointment-providers";

interface AppointmentsPanelProps {
  caseId: string;
  destinationCountry?: string | null;
}

// 2 MB cap for the inlined data-URL upload — keeps payloads sane in the
// in-memory demo. Real object storage would replace this entirely.
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled:   "bg-blue-100 text-blue-800 border-blue-200",
  completed:   "bg-green-100 text-green-800 border-green-200",
  rescheduled: "bg-amber-100 text-amber-800 border-amber-200",
  cancelled:   "bg-red-100 text-red-800 border-red-200",
};

const TYPE_LABEL: Record<AppointmentType, string> =
  Object.fromEntries(APPOINTMENT_TYPES.map(t => [t.value, t.label])) as Record<AppointmentType, string>;

interface FormState {
  appointmentType: AppointmentType;
  provider: string;            // embassy name OR VFS centre name
  customProvider: string;      // when "Other" is chosen in the dropdown
  location: string;            // city
  date: string;                // YYYY-MM-DD
  time: string;                // HH:MM
  notes: string;
  status: AppointmentStatus;
  confirmationFileUrl: string | null;
  confirmationFileName: string | null;
}

const EMPTY_FORM: FormState = {
  appointmentType: "embassy_consulate",
  provider: "",
  customProvider: "",
  location: "",
  date: "",
  time: "",
  notes: "",
  status: "scheduled",
  confirmationFileUrl: null,
  confirmationFileName: null,
};

export function AppointmentsPanel({ caseId, destinationCountry }: AppointmentsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/cases", caseId, "appointments"],
  });

  // Suggested embassies for the case's destination country (falls back to all
  // curated embassies if the destination isn't in our list — the agent can
  // also type a custom name).
  const embassyOptions = useMemo(() => {
    const suggested = suggestEmbassies(destinationCountry);
    if (suggested.length > 0) return suggested;
    return Object.values(EMBASSIES_BY_COUNTRY).flat();
  }, [destinationCountry]);

  const isThirdParty = form.appointmentType === "vfs"
    || form.appointmentType === "bls"
    || form.appointmentType === "other";

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(a: Appointment) {
    const d = new Date(a.scheduledAt);
    const isStandardEmbassy = embassyOptions.includes(a.provider);
    setEditingId(a.id);
    setForm({
      appointmentType: a.appointmentType as AppointmentType,
      provider: a.appointmentType === "embassy_consulate"
        ? (isStandardEmbassy ? a.provider : "__custom__")
        : a.provider,
      customProvider: a.appointmentType === "embassy_consulate" && !isStandardEmbassy ? a.provider : "",
      location: a.location ?? "",
      date: format(d, "yyyy-MM-dd"),
      time: format(d, "HH:mm"),
      notes: a.notes ?? "",
      status: a.status as AppointmentStatus,
      confirmationFileUrl: a.confirmationFileUrl ?? null,
      confirmationFileName: a.confirmationFileName ?? null,
    });
    setDialogOpen(true);
  }

  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({
        title: "File too large",
        description: `Confirmation files must be under ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB.`,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    // Read as data URL so it round-trips through the in-memory store and can
    // be downloaded later without needing object storage.
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    setForm(f => ({ ...f, confirmationFileUrl: dataUrl, confirmationFileName: file.name }));
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Resolve the actual provider string — either the picked one or the
      // custom typed value when the user picked "Other" in the embassy list.
      const providerResolved = form.appointmentType === "embassy_consulate" && form.provider === "__custom__"
        ? form.customProvider.trim()
        : form.provider.trim();
      if (!providerResolved) throw new Error("Please choose or type a provider name");
      if (!form.date || !form.time) throw new Error("Please pick a date and time");
      const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();

      const payload = {
        appointmentType: form.appointmentType,
        provider: providerResolved,
        location: form.location.trim() || null,
        scheduledAt,
        notes: form.notes.trim() || null,
        status: form.status,
        confirmationFileUrl: form.confirmationFileUrl,
        confirmationFileName: form.confirmationFileName,
      };

      if (editingId) {
        return apiRequest("PATCH", `/api/appointments/${editingId}`, payload);
      }
      return apiRequest("POST", `/api/cases/${caseId}/appointments`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "appointments"] });
      setDialogOpen(false);
      toast({ title: editingId ? "Appointment updated" : "Appointment scheduled" });
    },
    onError: (err: any) => {
      toast({
        title: "Could not save appointment",
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/appointments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "appointments"] });
      toast({ title: "Appointment removed" });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base">Appointments</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Embassy / consulate / high-commission visits and VFS / BLS / other 3rd-party bookings.
          </p>
        </div>
        <Button size="sm" onClick={openCreate} data-testid="button-add-appointment">
          <Plus className="h-4 w-4 mr-1" />
          Schedule appointment
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading appointments…</p>
        ) : appointments.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <CalendarIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No appointments yet. Schedule the embassy visit or 3rd-party (VFS / BLS) booking once it's booked.
            </p>
          </div>
        ) : (
          <ul className="space-y-3" data-testid="list-appointments">
            {appointments.map((a) => {
              const when = new Date(a.scheduledAt);
              return (
                <li
                  key={a.id}
                  data-testid={`appointment-${a.id}`}
                  className="border rounded-lg p-4 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <Badge variant="outline" className="text-xs">
                          {TYPE_LABEL[a.appointmentType as AppointmentType] ?? a.appointmentType}
                        </Badge>
                        <Badge className={`text-xs ${STATUS_COLORS[a.status as AppointmentStatus] ?? ""}`}>
                          {APPOINTMENT_STATUSES.find(s => s.value === a.status)?.label ?? a.status}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm" data-testid={`text-provider-${a.id}`}>{a.provider}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {format(when, "EEE, MMM d yyyy · HH:mm")}
                        </span>
                        {a.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {a.location}
                          </span>
                        )}
                        {a.confirmationFileUrl && (
                          <a
                            href={a.confirmationFileUrl}
                            download={a.confirmationFileName ?? "appointment-confirmation"}
                            className="flex items-center gap-1 text-primary hover:underline"
                            data-testid={`link-confirmation-${a.id}`}
                          >
                            <FileCheck className="h-3.5 w-3.5" />
                            {a.confirmationFileName ?? "Confirmation"}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {a.notes && (
                        <p className="text-xs mt-2 text-muted-foreground italic">{a.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(a)}
                        data-testid={`button-edit-appointment-${a.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Remove this appointment?")) deleteMutation.mutate(a.id);
                        }}
                        data-testid={`button-delete-appointment-${a.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit appointment" : "Schedule appointment"}</DialogTitle>
            <DialogDescription>
              Pick the appointment type — the provider list updates accordingly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Appointment type */}
            <div className="space-y-2">
              <Label>Appointment type</Label>
              <Select
                value={form.appointmentType}
                onValueChange={(v) => setForm(f => ({
                  ...f,
                  appointmentType: v as AppointmentType,
                  provider: "",        // reset provider when switching modes
                  customProvider: "",
                  location: "",
                }))}
              >
                <SelectTrigger data-testid="select-appointment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Provider — branches on type */}
            {form.appointmentType === "embassy_consulate" ? (
              <>
                <div className="space-y-2">
                  <Label>
                    Embassy / Consulate / High Commission
                    {destinationCountry && (
                      <span className="text-xs text-muted-foreground ml-2">
                        Suggestions for {destinationCountry}
                      </span>
                    )}
                  </Label>
                  <Select
                    value={form.provider}
                    onValueChange={(v) => setForm(f => ({ ...f, provider: v }))}
                  >
                    <SelectTrigger data-testid="select-embassy">
                      <SelectValue placeholder="Pick from list…" />
                    </SelectTrigger>
                    <SelectContent>
                      {embassyOptions.map(e => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                      <SelectItem value="__custom__">Other (type custom name)…</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.provider === "__custom__" && (
                    <Input
                      placeholder="Custom embassy / consulate name"
                      value={form.customProvider}
                      onChange={(e) => setForm(f => ({ ...f, customProvider: e.target.value }))}
                      data-testid="input-custom-embassy"
                    />
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>{form.appointmentType === "other" ? "Provider name" : "Provider"}</Label>
                  <Input
                    placeholder={
                      form.appointmentType === "vfs" ? "e.g. VFS Global"
                      : form.appointmentType === "bls" ? "e.g. BLS International"
                      : "Provider name"
                    }
                    value={form.provider}
                    onChange={(e) => setForm(f => ({ ...f, provider: e.target.value }))}
                    data-testid="input-provider"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City / Location</Label>
                  {form.appointmentType === "other" ? (
                    <Input
                      placeholder="City or address"
                      value={form.location}
                      onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                      data-testid="input-location"
                    />
                  ) : (
                    <Select
                      value={form.location}
                      onValueChange={(v) => setForm(f => ({ ...f, location: v }))}
                    >
                      <SelectTrigger data-testid="select-city">
                        <SelectValue placeholder="Pick a city…" />
                      </SelectTrigger>
                      <SelectContent>
                        {VFS_BLS_CITIES.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </>
            )}

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                  data-testid="input-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))}
                  data-testid="input-time"
                />
              </div>
            </div>

            {/* Status (only useful when editing) */}
            {editingId && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm(f => ({ ...f, status: v as AppointmentStatus }))}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Reference number, applicant arrival time, special instructions…"
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                data-testid="input-notes"
              />
            </div>

            {/* Confirmation upload */}
            <div className="space-y-2">
              <Label>Appointment confirmation (optional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleFilePick}
                data-testid="input-confirmation-file"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-confirmation"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {form.confirmationFileName ? "Replace file" : "Upload file"}
                </Button>
                {form.confirmationFileName && (
                  <span className="text-xs text-muted-foreground truncate">
                    {form.confirmationFileName}
                  </span>
                )}
                {form.confirmationFileName && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setForm(f => ({ ...f, confirmationFileUrl: null, confirmationFileName: null }))}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                PDF or image, up to 2 MB. Stored with the case for the team to reference.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid="button-save-appointment"
            >
              {saveMutation.isPending ? "Saving…" : (editingId ? "Save changes" : "Schedule")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
