import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import { useEffect } from "react";
import { usePlacesStore } from "../stores/placesStore";
import { Badge } from "@/components/ui/badge";

interface RouteSelectorProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function RouteSelector({ open, setOpen }: RouteSelectorProps) {
  const { selectedLocation } = usePlacesStore();

  useEffect(() => {
    if (selectedLocation) {
      setOpen(true);
    }
  }, [selectedLocation]);

  // Only render if there's a selected location
  if (!selectedLocation) {
    return null;
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen} modal={false}>
        <SheetContent
          side="bottom"
          className="left-16 right-96 mx-0 rounded-t-lg"
          style={{
            left: "4rem", // 16 * 0.25rem = 4rem
            right: "24rem", // 96 * 0.25rem = 24rem
          }}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <SheetHeader>
            <div className="flex flex-col justify-start items-start gap-2">
              <div className="flex w-full flex-wrap gap-2">
                <SheetTitle>
                  {selectedLocation.name}
                </SheetTitle>
              </div>
              <div className="flex w-full flex-wrap gap-2">
                {selectedLocation.tags?.map((tag: string) => (
                  <Badge variant="secondary" key={tag}>
                    {tag[0].toUpperCase() + tag.slice(1).replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-start items-start gap-2">
              <div className="flex flex-row justify-start items-center gap-2">
                <p className="text-sm text-muted-foreground">Price Level: </p>
                <p className="text-sm text-muted-foreground text-green-500">
                  {selectedLocation.price_level === undefined ||
                  selectedLocation.price_level === null
                    ? "N/A"
                    : selectedLocation.price_level === 0
                    ? "Free"
                    : "$".repeat(selectedLocation.price_level)}
                </p>
              </div>
              <div className="flex flex-row justify-start items-center gap-2">
                <p className="text-sm text-muted-foreground">Rating: </p>
                <p className="text-sm text-muted-foreground flex flex-row justify-start items-center gap-2">
                  {selectedLocation.rating}
                  <Star className="w-4 h-4" color="#FFD700" fill="yellow" />(
                  {selectedLocation.user_rating_total} reviews)
                </p>
              </div>
            </div>
            <SheetDescription>
              {selectedLocation.formatted_address}
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </>
  );
}
