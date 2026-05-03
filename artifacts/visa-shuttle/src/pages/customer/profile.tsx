import { useState } from "react";
import { User, Mail, Phone, MapPin, Calendar, FileText, Edit2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerLayout } from "@/components/layouts/customer-layout";
import { COUNTRIES } from "@/shared/destinations";

const initialProfile = {
  firstName: "John",
  lastName: "Smith",
  email: "john@email.com",
  phone: "+1 234 567 8901",
  nationality: "United States",
  dateOfBirth: "1990-05-15",
  passportNumber: "AB1234567",
  passportExpiry: "2028-05-15",
  address: "123 Main Street, New York, NY 10001"
};

export default function CustomerProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState(initialProfile);
  const [editedProfile, setEditedProfile] = useState(initialProfile);

  const handleSave = () => {
    setProfile(editedProfile);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">My Profile</h1>
            <p className="text-muted-foreground">Manage your personal information</p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="gap-2" data-testid="button-edit">
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} data-testid="button-cancel">
                Cancel
              </Button>
              <Button onClick={handleSave} className="gap-2" data-testid="button-save">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src="" />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {profile.firstName[0]}{profile.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-semibold">{profile.firstName} {profile.lastName}</h2>
                <p className="text-muted-foreground">{profile.email}</p>
                <p className="text-sm text-muted-foreground">{profile.nationality}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                {isEditing ? (
                  <Input
                    id="firstName"
                    value={editedProfile.firstName}
                    onChange={(e) => setEditedProfile({ ...editedProfile, firstName: e.target.value })}
                    data-testid="input-first-name"
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted/50 rounded-md">{profile.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                {isEditing ? (
                  <Input
                    id="lastName"
                    value={editedProfile.lastName}
                    onChange={(e) => setEditedProfile({ ...editedProfile, lastName: e.target.value })}
                    data-testid="input-last-name"
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted/50 rounded-md">{profile.lastName}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={editedProfile.email}
                      onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                      className="flex-1"
                      data-testid="input-email"
                    />
                  ) : (
                    <p className="text-sm">{profile.email}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={editedProfile.phone}
                      onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                      className="flex-1"
                      data-testid="input-phone"
                    />
                  ) : (
                    <p className="text-sm">{profile.phone}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {isEditing ? (
                    <Select 
                      value={editedProfile.nationality} 
                      onValueChange={(value) => setEditedProfile({ ...editedProfile, nationality: value })}
                    >
                      <SelectTrigger className="flex-1" data-testid="select-nationality">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm">{profile.nationality}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {isEditing ? (
                    <Input
                      id="dob"
                      type="date"
                      value={editedProfile.dateOfBirth}
                      onChange={(e) => setEditedProfile({ ...editedProfile, dateOfBirth: e.target.value })}
                      className="flex-1"
                      data-testid="input-dob"
                    />
                  ) : (
                    <p className="text-sm">{new Date(profile.dateOfBirth).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Passport Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="passportNumber">Passport Number</Label>
                {isEditing ? (
                  <Input
                    id="passportNumber"
                    value={editedProfile.passportNumber}
                    onChange={(e) => setEditedProfile({ ...editedProfile, passportNumber: e.target.value })}
                    data-testid="input-passport-number"
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted/50 rounded-md font-mono">{profile.passportNumber}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="passportExpiry">Expiry Date</Label>
                {isEditing ? (
                  <Input
                    id="passportExpiry"
                    type="date"
                    value={editedProfile.passportExpiry}
                    onChange={(e) => setEditedProfile({ ...editedProfile, passportExpiry: e.target.value })}
                    data-testid="input-passport-expiry"
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted/50 rounded-md">
                    {new Date(profile.passportExpiry).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="address">Full Address</Label>
              {isEditing ? (
                <Input
                  id="address"
                  value={editedProfile.address}
                  onChange={(e) => setEditedProfile({ ...editedProfile, address: e.target.value })}
                  data-testid="input-address"
                />
              ) : (
                <p className="text-sm p-2 bg-muted/50 rounded-md">{profile.address}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}
