"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface DashboardDatePickerProps {
  initialStart: string;
  initialEnd: string;
}

export function DashboardDatePicker({
  initialStart,
  initialEnd,
}: DashboardDatePickerProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(initialStart));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date(initialEnd));
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const applyDates = (start: Date, end: Date) => {
    const params = new URLSearchParams();
    params.set("start", format(start, "yyyy-MM-dd"));
    params.set("end", format(end, "yyyy-MM-dd"));
    router.push(`/?${params.toString()}`);
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      setStartDate(date);
      setStartOpen(false);
      if (endDate && date <= endDate) {
        applyDates(date, endDate);
      }
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      setEndDate(date);
      setEndOpen(false);
      if (startDate && startDate <= date) {
        applyDates(startDate, date);
      }
    }
  };

  const setPreset = (preset: "ytd" | "thisMonth" | "lastMonth" | "last3Months" | "last6Months" | "thisYear") => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (preset) {
      case "ytd":
        start = new Date(today.getFullYear(), 0, 1); // Jan 1 of current year
        break;
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "lastMonth":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "last3Months":
        start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        break;
      case "last6Months":
        start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        break;
      case "thisYear":
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      default:
        start = new Date(today.getFullYear(), 0, 1);
    }

    setStartDate(start);
    setEndDate(end);
    applyDates(start, end);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Start Date Picker */}
      <Popover open={startOpen} onOpenChange={setStartOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-[140px] justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? format(startDate, "dd MMM yyyy", { locale: th }) : "Start date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={handleStartDateSelect}
            disabled={(date) => (endDate ? date > endDate : false)}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <span className="text-gray-500">-</span>

      {/* End Date Picker */}
      <Popover open={endOpen} onOpenChange={setEndOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-[140px] justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {endDate ? format(endDate, "dd MMM yyyy", { locale: th }) : "End date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={handleEndDateSelect}
            disabled={(date) => (startDate ? date < startDate : false)}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Preset Buttons */}
      <div className="flex gap-1 ml-2">
        <Button variant="ghost" size="sm" onClick={() => setPreset("ytd")}>
          YTD
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setPreset("thisMonth")}>
          This Month
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setPreset("last3Months")}>
          3 Months
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setPreset("last6Months")}>
          6 Months
        </Button>
      </div>
    </div>
  );
}
