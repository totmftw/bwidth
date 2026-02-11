import { useAuth } from "@/hooks/use-auth";
import { useUpdateArtist } from "@/hooks/use-artists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export default function Profile() {
  const { user } = useAuth();
  const updateArtist = useUpdateArtist();

  if (!user) return null;
  const isArtist = user.role === "artist";

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your public appearance and account details</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="space-y-6">
          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle>Avatar</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Avatar className="w-32 h-32 border-4 border-primary/20">
                <AvatarFallback className="text-4xl bg-secondary">{(user.name || user.username || "U")[0]}</AvatarFallback>
              </Avatar>
              <Button variant="outline" className="w-full">Change Photo</Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          {isArtist && user.artist && (
            <ArtistProfileForm artist={user.artist} updateMutation={updateArtist} />
          )}

          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle>Account Info</CardTitle>
              <CardDescription>Personal details used for contracts (Private)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input defaultValue={user.name} disabled className="bg-white/5" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue={user.email} disabled className="bg-white/5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ArtistProfileForm({ artist, updateMutation }: { artist: any, updateMutation: any }) {
  const metadata = artist.metadata as any || {};
  const form = useForm({
    defaultValues: {
      bio: artist.bio || "",
      primaryGenre: metadata.primaryGenre || metadata.genre || "",
      feeMin: Number(artist.priceFrom) || 0,
      feeMax: Number(artist.priceTo) || 0,
      instagram: metadata.instagram || "",
      soundcloud: metadata.soundcloud || "",
    }
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate({
      id: artist.id,
      ...data,
      feeMin: Number(data.feeMin),
      feeMax: Number(data.feeMax),
    });
  };

  return (
    <Card className="glass-card border-white/5">
      <CardHeader>
        <CardTitle>Artist Details</CardTitle>
        <CardDescription>This information is visible to organizers.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea {...form.register("bio")} className="bg-background min-h-[100px]" />
          </div>

          <div className="space-y-2">
            <Label>Genre</Label>
            <Input {...form.register("primaryGenre")} className="bg-background" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Fee ($)</Label>
              <Input type="number" {...form.register("feeMin")} className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Max Fee ($)</Label>
              <Input type="number" {...form.register("feeMax")} className="bg-background" />
            </div>
          </div>

          <Separator className="bg-white/10 my-4" />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Instagram Handle</Label>
              <Input {...form.register("instagram")} placeholder="@username" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>SoundCloud URL</Label>
              <Input {...form.register("soundcloud")} placeholder="https://soundcloud.com/..." className="bg-background" />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending} className="bg-primary">
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
