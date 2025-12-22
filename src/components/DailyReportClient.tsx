"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CalendarIcon, Check, ChevronsUpDown, X, Filter } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface FilterOptions {
  vendors: string[];
  paymentTypes: string[];
  departments: string[];
  items: string[];
  references: string[];
}

interface DailyReportClientProps {
  initialStart: string;
  initialEnd: string;
  filterOptions: FilterOptions;
  initialFilters?: {
    vendor?: string;
    paymentType?: string;
    department?: string;
    item?: string;
    reference?: string;
  };
}

export function DailyReportClient({
  initialStart,
  initialEnd,
  filterOptions,
  initialFilters = {},
}: DailyReportClientProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(initialStart));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date(initialEnd));
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  // Filter states
  const [vendor, setVendor] = useState(initialFilters.vendor || "");
  const [paymentType, setPaymentType] = useState(initialFilters.paymentType || "");
  const [department, setDepartment] = useState(initialFilters.department || "");
  const [item, setItem] = useState(initialFilters.item || "");
  const [reference, setReference] = useState(initialFilters.reference || "");

  // Popover states for filters
  const [vendorOpen, setVendorOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);

  const buildUrl = (
    start: Date,
    end: Date,
    filters: { vendor?: string; paymentType?: string; department?: string; item?: string; reference?: string }
  ) => {
    const params = new URLSearchParams();
    params.set("start", format(start, "yyyy-MM-dd"));
    params.set("end", format(end, "yyyy-MM-dd"));
    if (filters.vendor) params.set("vendor", filters.vendor);
    if (filters.paymentType) params.set("paymentType", filters.paymentType);
    if (filters.department) params.set("department", filters.department);
    if (filters.item) params.set("item", filters.item);
    if (filters.reference) params.set("reference", filters.reference);
    return `/daily-report?${params.toString()}`;
  };

  const applyFilters = (
    start: Date,
    end: Date,
    filters: { vendor?: string; paymentType?: string; department?: string; item?: string; reference?: string }
  ) => {
    router.push(buildUrl(start, end, filters));
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      setStartDate(date);
      setStartOpen(false);
      if (endDate && date <= endDate) {
        applyFilters(date, endDate, { vendor, paymentType, department, item, reference });
      }
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      setEndDate(date);
      setEndOpen(false);
      if (startDate && startDate <= date) {
        applyFilters(startDate, date, { vendor, paymentType, department, item, reference });
      }
    }
  };

  const setPreset = (preset: "today" | "7days" | "thisMonth" | "lastMonth") => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (preset) {
      case "today":
        start = today;
        break;
      case "7days":
        start = new Date(today);
        start.setDate(today.getDate() - 6);
        break;
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "lastMonth":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
    }

    setStartDate(start);
    setEndDate(end);
    applyFilters(start, end, { vendor, paymentType, department, item, reference });
  };

  const handleFilterChange = (
    type: "vendor" | "paymentType" | "department" | "item" | "reference",
    value: string
  ) => {
    const newFilters = { vendor, paymentType, department, item, reference };

    switch (type) {
      case "vendor":
        setVendor(value);
        newFilters.vendor = value;
        setVendorOpen(false);
        break;
      case "paymentType":
        setPaymentType(value);
        newFilters.paymentType = value;
        setPaymentOpen(false);
        break;
      case "department":
        setDepartment(value);
        newFilters.department = value;
        setDeptOpen(false);
        break;
      case "item":
        setItem(value);
        newFilters.item = value;
        setItemOpen(false);
        break;
      case "reference":
        setReference(value);
        newFilters.reference = value;
        setRefOpen(false);
        break;
    }

    if (startDate && endDate) {
      applyFilters(startDate, endDate, newFilters);
    }
  };

  const clearFilter = (type: "vendor" | "paymentType" | "department" | "item" | "reference") => {
    handleFilterChange(type, "");
  };

  const clearAllFilters = () => {
    setVendor("");
    setPaymentType("");
    setDepartment("");
    setItem("");
    setReference("");
    if (startDate && endDate) {
      applyFilters(startDate, endDate, {});
    }
  };

  const hasActiveFilters = vendor || paymentType || department || item || reference;

  return (
    <div className="space-y-3">
      {/* Date Pickers Row */}
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
          <Button variant="ghost" size="sm" onClick={() => setPreset("today")}>
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPreset("7days")}>
            7 Days
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPreset("thisMonth")}>
            This Month
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPreset("lastMonth")}>
            Last Month
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />

        {/* Vendor Filter */}
        <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              role="combobox"
              aria-expanded={vendorOpen}
              className={cn("w-[180px] justify-between", vendor && "border-blue-500")}
            >
              <span className="truncate">
                {vendor || "Vendor"}
              </span>
              {vendor ? (
                <X
                  className="ml-1 h-3 w-3 shrink-0 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilter("vendor");
                  }}
                />
              ) : (
                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search vendor..." />
              <CommandList>
                <CommandEmpty>No vendor found.</CommandEmpty>
                <CommandGroup>
                  {filterOptions.vendors.map((v) => (
                    <CommandItem
                      key={v}
                      value={v}
                      onSelect={() => handleFilterChange("vendor", v)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          vendor === v ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{v}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Payment Type Filter */}
        <Popover open={paymentOpen} onOpenChange={setPaymentOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              role="combobox"
              aria-expanded={paymentOpen}
              className={cn("w-[150px] justify-between", paymentType && "border-blue-500")}
            >
              <span className="truncate">
                {paymentType || "Payment"}
              </span>
              {paymentType ? (
                <X
                  className="ml-1 h-3 w-3 shrink-0 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilter("paymentType");
                  }}
                />
              ) : (
                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search payment..." />
              <CommandList>
                <CommandEmpty>No payment type found.</CommandEmpty>
                <CommandGroup>
                  {filterOptions.paymentTypes.map((p) => (
                    <CommandItem
                      key={p}
                      value={p}
                      onSelect={() => handleFilterChange("paymentType", p)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          paymentType === p ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{p}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Department Filter */}
        <Popover open={deptOpen} onOpenChange={setDeptOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              role="combobox"
              aria-expanded={deptOpen}
              className={cn("w-[150px] justify-between", department && "border-blue-500")}
            >
              <span className="truncate">
                {department || "Department"}
              </span>
              {department ? (
                <X
                  className="ml-1 h-3 w-3 shrink-0 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilter("department");
                  }}
                />
              ) : (
                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search department..." />
              <CommandList>
                <CommandEmpty>No department found.</CommandEmpty>
                <CommandGroup>
                  {filterOptions.departments.map((d) => (
                    <CommandItem
                      key={d}
                      value={d}
                      onSelect={() => handleFilterChange("department", d)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          department === d ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{d}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Item Filter */}
        <Popover open={itemOpen} onOpenChange={setItemOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              role="combobox"
              aria-expanded={itemOpen}
              className={cn("w-[180px] justify-between", item && "border-blue-500")}
            >
              <span className="truncate">
                {item || "Item"}
              </span>
              {item ? (
                <X
                  className="ml-1 h-3 w-3 shrink-0 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilter("item");
                  }}
                />
              ) : (
                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search item..." />
              <CommandList>
                <CommandEmpty>No item found.</CommandEmpty>
                <CommandGroup>
                  {filterOptions.items.map((i) => (
                    <CommandItem
                      key={i}
                      value={i}
                      onSelect={() => handleFilterChange("item", i)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          item === i ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{i}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Reference Filter */}
        <Popover open={refOpen} onOpenChange={setRefOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              role="combobox"
              aria-expanded={refOpen}
              className={cn("w-[180px] justify-between", reference && "border-blue-500")}
            >
              <span className="truncate">
                {reference || "Reference"}
              </span>
              {reference ? (
                <X
                  className="ml-1 h-3 w-3 shrink-0 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilter("reference");
                  }}
                />
              ) : (
                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search reference..." />
              <CommandList>
                <CommandEmpty>No reference found.</CommandEmpty>
                <CommandGroup>
                  {filterOptions.references.map((r) => (
                    <CommandItem
                      key={r}
                      value={r}
                      onSelect={() => handleFilterChange("reference", r)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          reference === r ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{r}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Clear All Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
}
