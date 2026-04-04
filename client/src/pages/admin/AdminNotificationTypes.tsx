import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bell,
  Plus,
  Pencil,
  Loader2,
  Save,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface NotificationType {
  id: number;
  key: string;
  category: string;
  label: string;
  description?: string;
  titleTemplate: string;
  bodyTemplate: string;
  targetRoles: string[];
  channels: string[];
  enabled: boolean;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ["booking", "negotiation", "contract", "payment", "system"];
const ROLES = ["artist", "organizer", "venue_manager", "admin"];
const CHANNELS = ["in_app", "email", "sms", "push"];
const PRIORITIES = ["normal", "urgent"];

const emptyForm: Partial<NotificationType> = {
  key: "",
  category: "system",
  label: "",
  description: "",
  titleTemplate: "",
  bodyTemplate: "",
  targetRoles: ["artist"],
  channels: ["in_app"],
  enabled: true,
  priority: "normal",
};

export default function AdminNotificationTypes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<NotificationType | null>(null);
  const [form, setForm] = useState<Partial<NotificationType>>(emptyForm);

  const { data: types = [], isLoading } = useQuery<NotificationType[]>({
    queryKey: ["/api/admin/notification-types"],
    queryFn: async () => {
      const res = await fetch("/api/admin/notification-types", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<NotificationType>) => {
      if (editingType) {
        await apiRequest("PUT", `/api/admin/notification-types/${editingType.id}`, data);
      } else {
        await apiRequest("POST", "/api/admin/notification-types", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-types"] });
      toast({ title: editingType ? "Type updated" : "Type created" });
      setDialogOpen(false);
      setEditingType(null);
      setForm(emptyForm);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      await apiRequest("PUT", `/api/admin/notification-types/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-types"] });
    },
  });

  const openCreate = () => {
    setEditingType(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (type: NotificationType) => {
    setEditingType(type);
    setForm({
      key: type.key,
      category: type.category,
      label: type.label,
      description: type.description,
      titleTemplate: type.titleTemplate,
      bodyTemplate: type.bodyTemplate,
      targetRoles: type.targetRoles,
      channels: type.channels,
      enabled: type.enabled,
      priority: type.priority,
    });
    setDialogOpen(true);
  };

  const toggleArrayItem = (arr: string[], item: string): string[] => {
    return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
  };

  const groupedByCategory = CATEGORIES.map((cat) => ({
    category: cat,
    types: types.filter((t) => t.category === cat),
  })).filter((g) => g.types.length > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" /> Notification Types
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage what notifications are sent and to whom
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> New Type
        </Button>
      </div>

      {groupedByCategory.map((group) => (
        <motion.div
          key={group.category}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg capitalize">{group.category}</CardTitle>
              <CardDescription>{group.types.length} notification type(s)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.types.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{type.label}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {type.key}
                      </Badge>
                      {type.priority === "urgent" && (
                        <Badge variant="destructive" className="text-[10px]">
                          urgent
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {type.description}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {(type.targetRoles as string[]).map((role) => (
                        <Badge key={role} variant="secondary" className="text-[10px]">
                          {role}
                        </Badge>
                      ))}
                      <span className="text-muted-foreground text-[10px] mx-1">via</span>
                      {(type.channels as string[]).map((ch) => (
                        <Badge key={ch} variant="outline" className="text-[10px]">
                          {ch}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleMutation.mutate({ id: type.id, enabled: !type.enabled })}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {type.enabled ? (
                        <ToggleRight className="w-6 h-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                      )}
                    </button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(type)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingType ? "Edit Notification Type" : "Create Notification Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Key</Label>
                <Input
                  value={form.key || ""}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  placeholder="booking.new_event"
                  disabled={!!editingType}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Label</Label>
              <Input
                value={form.label || ""}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Human-readable name"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Input
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Admin-facing description"
              />
            </div>

            <div>
              <Label>Title Template</Label>
              <Input
                value={form.titleTemplate || ""}
                onChange={(e) => setForm({ ...form, titleTemplate: e.target.value })}
                placeholder="New booking for {{eventTitle}}"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Variables: {"{{artistName}}, {{eventTitle}}, {{actorName}}, {{amount}}, {{newStatus}}"}
              </p>
            </div>

            <div>
              <Label>Body Template</Label>
              <Textarea
                value={form.bodyTemplate || ""}
                onChange={(e) => setForm({ ...form, bodyTemplate: e.target.value })}
                placeholder="{{artistName}} has applied to perform at {{eventTitle}}."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={form.enabled}
                    onCheckedChange={(checked) => setForm({ ...form, enabled: !!checked })}
                  />
                  <Label>Enabled</Label>
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Target Roles</Label>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={(form.targetRoles || []).includes(role)}
                      onCheckedChange={() =>
                        setForm({ ...form, targetRoles: toggleArrayItem(form.targetRoles || [], role) })
                      }
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Channels</Label>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((ch) => (
                  <label key={ch} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={(form.channels || []).includes(ch)}
                      onCheckedChange={() =>
                        setForm({ ...form, channels: toggleArrayItem(form.channels || [], ch) })
                      }
                    />
                    {ch}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingType ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
