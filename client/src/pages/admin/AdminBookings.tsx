import { Construction } from "lucide-react";

export default function AdminBookings() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
            <div className="bg-muted/30 p-6 rounded-full">
                <Construction className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Booking Management</h2>
            <p className="text-muted-foreground max-w-md">
                This module is currently under development. Soon admins will be able to view and manage all platform bookings here.
            </p>
        </div>
    );
}
