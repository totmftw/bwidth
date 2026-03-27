import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useOrganizerProfile,
  useUpdateOrganizerProfile,
} from "@/hooks/use-organizer";
import { useOrganizerBookingSummary } from "@/hooks/use-organizer-stats";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Phone,
  Globe,
  Edit,
  Save,
  X,
  Star,
  Calendar,
  CheckCircle,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Instagram,
  Twitter,
  Linkedin,
  IndianRupee,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { z } from "zod";
import { api } from "@shared/routes";
import { Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

type UpdateOrganizerInput = z.infer<typeof api.organizer.profile.update.input>;

export default function OrganizerProfile() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useOrganizerProfile();
  const { data: bookingSummary, isLoading: summaryLoading } = useOrganizerBookingSummary();
  const updateProfile = useUpdateOrganizerProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateOrganizerInput>({});

  if (!user) return null;

  // Initialize form data when entering edit mode
  const handleEditClick = () => {
    if (profile) {
      const metadata = (profile.metadata ?? {}) as Record<string, any>;
      const contactPerson = (profile.contactPerson ?? {}) as Record<string, any>;
      const socialLinks = (metadata.socialLinks ?? {}) as Record<string, any>;

      setFormData({
        name: profile.name || "",
        description: profile.description || "",
        contactPerson: {
          name: contactPerson.name || "",
          email: contactPerson.email || "",
          phone: contactPerson.phone || "",
        },
        website: metadata.website || "",
        socialLinks: {
          instagram: socialLinks.instagram || "",
          twitter: socialLinks.twitter || "",
          linkedin: socialLinks.linkedin || "",
        },
      });
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({});
  };

  const handleSave = async () => {
    await updateProfile.mutateAsync(formData);
    setIsEditing(false);
  };

  const metadata = (profile?.metadata ?? {}) as Record<string, any>;
  const contactPerson = (profile?.contactPerson ?? {}) as Record<string, any>;
  const socialLinks = (metadata.socialLinks ?? {}) as Record<string, any>;
  const trustScore = metadata.trustScore ?? 50;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold">Organizer Profile</h1>
          <p className="text-muted-foreground">
            Manage your organization details and view your booking history
          </p>
        </div>
        {!isEditing && (
          <Button onClick={handleEditClick} className="gap-2">
            <Edit className="w-4 h-4" />
            Edit Profile
          </Button>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Profile Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Organization Details */}
          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Organization Details
              </CardTitle>
              <CardDescription>
                Your organization information visible to artists
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {profileLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Organization Name *</Label>
                    <Input
                      id="name"
                      value={formData.name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Enter organization name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Tell artists about your organization"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="website"
                        type="url"
                        value={formData.website || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, website: e.target.value })
                        }
                        placeholder="https://yourwebsite.com"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <h4 className="font-semibold mb-4">Contact Person</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactName">Name *</Label>
                        <Input
                          id="contactName"
                          value={formData.contactPerson?.name || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              contactPerson: {
                                ...formData.contactPerson,
                                name: e.target.value,
                                email: formData.contactPerson?.email || "",
                                phone: formData.contactPerson?.phone || "",
                              },
                            })
                          }
                          placeholder="Contact person name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contactEmail">Email *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="contactEmail"
                            type="email"
                            value={formData.contactPerson?.email || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                contactPerson: {
                                  ...formData.contactPerson,
                                  name: formData.contactPerson?.name || "",
                                  email: e.target.value,
                                  phone: formData.contactPerson?.phone || "",
                                },
                              })
                            }
                            placeholder="contact@example.com"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contactPhone">Phone *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="contactPhone"
                            type="tel"
                            value={formData.contactPerson?.phone || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                contactPerson: {
                                  ...formData.contactPerson,
                                  name: formData.contactPerson?.name || "",
                                  email: formData.contactPerson?.email || "",
                                  phone: e.target.value,
                                },
                              })
                            }
                            placeholder="+91 98765 43210"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <h4 className="font-semibold mb-4">Social Media Links</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="instagram">Instagram</Label>
                        <div className="relative">
                          <Instagram className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="instagram"
                            value={formData.socialLinks?.instagram || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                socialLinks: {
                                  ...formData.socialLinks,
                                  instagram: e.target.value,
                                },
                              })
                            }
                            placeholder="@yourhandle"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="twitter">Twitter</Label>
                        <div className="relative">
                          <Twitter className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="twitter"
                            value={formData.socialLinks?.twitter || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                socialLinks: {
                                  ...formData.socialLinks,
                                  twitter: e.target.value,
                                },
                              })
                            }
                            placeholder="@yourhandle"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="linkedin">LinkedIn</Label>
                        <div className="relative">
                          <Linkedin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="linkedin"
                            value={formData.socialLinks?.linkedin || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                socialLinks: {
                                  ...formData.socialLinks,
                                  linkedin: e.target.value,
                                },
                              })
                            }
                            placeholder="company-name"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={updateProfile.isPending}
                      className="gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {updateProfile.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      disabled={updateProfile.isPending}
                      className="gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">Organization Name</Label>
                      <p className="text-lg font-semibold mt-1">
                        {profile?.name || "Not set"}
                      </p>
                    </div>

                    <div>
                      <Label className="text-muted-foreground">Description</Label>
                      <p className="mt-1 text-sm">
                        {profile?.description || "No description provided"}
                      </p>
                    </div>

                    {metadata.website && (
                      <div>
                        <Label className="text-muted-foreground">Website</Label>
                        <a
                          href={metadata.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 mt-1 text-primary hover:underline"
                        >
                          <Globe className="w-4 h-4" />
                          {metadata.website}
                        </a>
                      </div>
                    )}

                    <div className="pt-4 border-t border-white/5">
                      <Label className="text-muted-foreground mb-3 block">
                        Contact Person
                      </Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{contactPerson.name || "Not set"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{contactPerson.email || "Not set"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{contactPerson.phone || "Not set"}</span>
                        </div>
                      </div>
                    </div>

                    {(socialLinks.instagram || socialLinks.twitter || socialLinks.linkedin) && (
                      <div className="pt-4 border-t border-white/5">
                        <Label className="text-muted-foreground mb-3 block">
                          Social Media
                        </Label>
                        <div className="flex gap-4">
                          {socialLinks.instagram && (
                            <a
                              href={`https://instagram.com/${socialLinks.instagram.replace("@", "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                            >
                              <Instagram className="w-4 h-4" />
                              {socialLinks.instagram}
                            </a>
                          )}
                          {socialLinks.twitter && (
                            <a
                              href={`https://twitter.com/${socialLinks.twitter.replace("@", "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                            >
                              <Twitter className="w-4 h-4" />
                              {socialLinks.twitter}
                            </a>
                          )}
                          {socialLinks.linkedin && (
                            <a
                              href={`https://linkedin.com/company/${socialLinks.linkedin}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                            >
                              <Linkedin className="w-4 h-4" />
                              {socialLinks.linkedin}
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Booking History Summary */}
          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Booking History Summary
              </CardTitle>
              <CardDescription>
                Your booking performance and statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 text-blue-500 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">Total Bookings</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {bookingSummary?.totalBookings || 0}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 text-green-500 mb-2">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Completed</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {bookingSummary?.completedBookings || 0}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2 text-yellow-500 mb-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Cancellation Rate</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {bookingSummary?.cancellationRate ? `${bookingSummary.cancellationRate}%` : "0%"}
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 text-purple-500 mb-2">
                      <IndianRupee className="w-4 h-4" />
                      <span className="text-sm font-medium">Total Spent</span>
                    </div>
                    <p className="text-2xl font-bold">
                      ₹{bookingSummary?.totalSpent?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Legal & Bank Tab */}
          <LegalBankTab user={user} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Trust Score */}
          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Star className="w-5 h-5 text-yellow-500" />
                Trust Score
              </CardTitle>
              <CardDescription>Your platform reputation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="relative inline-flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center border-4 border-yellow-500/30">
                    <div className="text-center">
                      <p className="text-4xl font-bold">{trustScore}</p>
                      <p className="text-xs text-muted-foreground">out of 100</p>
                    </div>
                  </div>
                </div>

                <div className="w-full bg-background/40 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all"
                    style={{ width: `${trustScore}%` }}
                  />
                </div>

                <div className="text-left space-y-2 pt-4 border-t border-white/5">
                  <p className="text-sm font-medium">How it's calculated:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Completed bookings</li>
                    <li>• On-time payments</li>
                    <li>• Artist feedback</li>
                    <li>• Contract compliance</li>
                    <li>• Platform activity</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="text-lg">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member Since</span>
                <span className="font-medium">
                  {profile?.createdAt
                    ? format(new Date(profile.createdAt), "MMM dd, yyyy")
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-medium">
                  {profile?.updatedAt
                    ? format(new Date(profile.updatedAt), "MMM dd, yyyy")
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profile Status</span>
                <Badge
                  variant="outline"
                  className="bg-green-500/10 text-green-500 border-green-500/20"
                >
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LegalBankTab({ user }: { user: any }) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const form = useForm({
        defaultValues: {
            legalName: user.legalName || "",
            permanentAddress: user.permanentAddress || "",
            panNumber: user.panNumber || "",
            gstin: user.gstin || "",
            bankAccountNumber: user.bankAccountNumber || "",
            bankIfsc: user.bankIfsc || "",
            bankBranch: user.bankBranch || "",
            bankAccountHolderName: user.bankAccountHolderName || "",
        }
    });

    const onSubmit = async (data: any) => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/users/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update");
            toast({ title: "Legal profile updated successfully" });
        } catch (error) {
            toast({ title: "Failed to update profile", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="glass-card border-white/5">
            <CardHeader>
                <CardTitle>Legal & Bank Details</CardTitle>
                <CardDescription>Mandatory information for contract generation and payments</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="font-medium flex items-center gap-2 text-primary">
                            <Shield className="w-4 h-4" />
                            Legal Identity
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Full Legal Name</Label>
                                <Input {...form.register("legalName")} placeholder="As per PAN card" className="bg-background/60" />
                            </div>
                            <div className="space-y-2">
                                <Label>PAN Number</Label>
                                <Input {...form.register("panNumber")} placeholder="ABCDE1234F" className="bg-background/60" />
                            </div>
                            <div className="space-y-2">
                                <Label>GSTIN (Optional)</Label>
                                <Input {...form.register("gstin")} placeholder="GST Number if applicable" className="bg-background/60" />
                            </div>
                            <div className="space-y-2">
                                <Label>Permanent Address</Label>
                                <Input {...form.register("permanentAddress")} placeholder="Full address for contracts" className="bg-background/60" />
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-white/5" />

                    <div className="space-y-4">
                        <h3 className="font-medium flex items-center gap-2 text-primary">
                            <DollarSign className="w-4 h-4" />
                            Bank Account Details
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Account Holder Name</Label>
                                <Input {...form.register("bankAccountHolderName")} className="bg-background/60" />
                            </div>
                            <div className="space-y-2">
                                <Label>Account Number</Label>
                                <Input {...form.register("bankAccountNumber")} type="password" placeholder="••••••••" className="bg-background/60" />
                            </div>
                            <div className="space-y-2">
                                <Label>IFSC Code</Label>
                                <Input {...form.register("bankIfsc")} placeholder="e.g. HDFC0001234" className="bg-background/60" />
                            </div>
                            <div className="space-y-2">
                                <Label>Branch Name</Label>
                                <Input {...form.register("bankBranch")} placeholder="e.g. Bandra West" className="bg-background/60" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isSaving} className="bg-primary gap-2">
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            <Save className="w-4 h-4" />
                            Save Legal Details
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
