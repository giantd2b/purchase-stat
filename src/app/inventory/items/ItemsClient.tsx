"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StockItemWithDetails } from "@/lib/inventory-db";
import { addItemToStockAction, updateStockItemAction } from "../actions";

interface AvailableItem {
  id: string;
  name: string;
  unit: string | null;
  type: string | null;
  category: string | null;
  supplier1: string | null;
  supplier2: string | null;
}

interface Props {
  stockItems: StockItemWithDetails[];
  availableItems: AvailableItem[];
}

function formatNumber(num: number): string {
  return num.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatCurrency(num: number): string {
  return num.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ItemsClient({ stockItems, availableItems }: Props) {
  const [isPending, startTransition] = useTransition();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemComboboxOpen, setItemComboboxOpen] = useState(false);

  // Add form state
  const [selectedItemId, setSelectedItemId] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [location, setLocation] = useState("");

  // Helper function to get selected item name
  const getSelectedItemName = (itemId: string) => {
    const item = availableItems.find((i) => i.id === itemId);
    return item ? `${item.id} - ${item.name}` : "";
  };

  // Edit form state
  const [editingItem, setEditingItem] = useState<StockItemWithDetails | null>(
    null
  );
  const [editMinQuantity, setEditMinQuantity] = useState("");
  const [editMaxQuantity, setEditMaxQuantity] = useState("");
  const [editLocation, setEditLocation] = useState("");

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedItemId) {
      setError("กรุณาเลือกสินค้า");
      return;
    }

    startTransition(async () => {
      const result = await addItemToStockAction({
        itemId: selectedItemId,
        minQuantity: minQuantity ? parseFloat(minQuantity) : undefined,
        maxQuantity: maxQuantity ? parseFloat(maxQuantity) : undefined,
        location: location || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setAddDialogOpen(false);
        setSelectedItemId("");
        setMinQuantity("");
        setMaxQuantity("");
        setLocation("");
      }
    });
  };

  const openEditDialog = (item: StockItemWithDetails) => {
    setEditingItem(item);
    setEditMinQuantity(item.minQuantity?.toString() || "");
    setEditMaxQuantity(item.maxQuantity?.toString() || "");
    setEditLocation(item.location || "");
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!editingItem) return;

    startTransition(async () => {
      const result = await updateStockItemAction(editingItem.id, {
        minQuantity: editMinQuantity ? parseFloat(editMinQuantity) : null,
        maxQuantity: editMaxQuantity ? parseFloat(editMaxQuantity) : null,
        location: editLocation || null,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setEditDialogOpen(false);
        setEditingItem(null);
      }
    });
  };

  const filteredStockItems = stockItems.filter(
    (item) =>
      item.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.item.category &&
        item.item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.item.type &&
        item.item.type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                จัดการสินค้าในสต๊อก
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                เพิ่มสินค้าเข้าระบบสต๊อก และตั้งค่าระดับ min/max
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>+ เพิ่มสินค้าเข้าสต๊อก</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>เพิ่มสินค้าเข้าระบบสต๊อก</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddSubmit} className="space-y-4">
                    {error && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                        {error}
                      </div>
                    )}

                    <div>
                      <Label>เลือกสินค้า (พิมพ์ค้นหา รหัส, ชื่อ, หมวด, ประเภท)</Label>
                      <Popover open={itemComboboxOpen} onOpenChange={setItemComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={itemComboboxOpen}
                            className="w-full justify-between font-normal"
                          >
                            {selectedItemId
                              ? getSelectedItemName(selectedItemId)
                              : "เลือกสินค้าที่ยังไม่อยู่ในสต๊อก..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[450px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="ค้นหา รหัส, ชื่อ, หมวด, ประเภท..." />
                            <CommandList>
                              <CommandEmpty>
                                {availableItems.length === 0
                                  ? "ไม่มีสินค้าที่พร้อมเพิ่ม"
                                  : "ไม่พบสินค้าที่ค้นหา"}
                              </CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                {availableItems.map((item) => (
                                  <CommandItem
                                    key={item.id}
                                    value={`${item.id} ${item.name} ${item.category || ""} ${item.type || ""} ${item.supplier1 || ""} ${item.supplier2 || ""}`}
                                    onSelect={() => {
                                      setSelectedItemId(item.id);
                                      setItemComboboxOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedItemId === item.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">{item.id} - {item.name} ({item.unit || "-"})</span>
                                      {(item.category || item.type) && (
                                        <span className="text-xs text-muted-foreground">
                                          {[item.category, item.type].filter(Boolean).join(" / ")}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>จำนวนขั้นต่ำ (Min)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={minQuantity}
                          onChange={(e) => setMinQuantity(e.target.value)}
                          placeholder="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          แจ้งเตือนเมื่อต่ำกว่า
                        </p>
                      </div>

                      <div>
                        <Label>จำนวนสูงสุด (Max)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={maxQuantity}
                          onChange={(e) => setMaxQuantity(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>ตำแหน่งจัดเก็บ</Label>
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="เช่น ชั้น A-1"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isPending || !selectedItemId}
                      className="w-full"
                    >
                      {isPending ? "กำลังบันทึก..." : "เพิ่มสินค้า"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Link href="/inventory">
                <Button variant="outline">กลับหน้าคลังสินค้า</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Input
              placeholder="ค้นหา รหัส, ชื่อ, หมวด, ประเภท..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              สินค้าในสต๊อก ({filteredStockItems.length} รายการ)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredStockItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchTerm
                  ? "ไม่พบสินค้าที่ค้นหา"
                  : "ยังไม่มีสินค้าในสต๊อก กดปุ่ม 'เพิ่มสินค้าเข้าสต๊อก' เพื่อเริ่มต้น"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัส</TableHead>
                    <TableHead>ชื่อสินค้า</TableHead>
                    <TableHead>หมวด/ประเภท</TableHead>
                    <TableHead className="text-right">คงเหลือ</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead className="text-right">ต้นทุน</TableHead>
                    <TableHead>ตำแหน่ง</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStockItems.map((item) => {
                    const isLowStock =
                      item.minQuantity !== null &&
                      item.currentQuantity <= item.minQuantity;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">
                          {item.item.id}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.item.name}</div>
                          <div className="text-xs text-gray-500">
                            {item.item.unit}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          <div>{item.item.category || "-"}</div>
                          <div className="text-xs">{item.item.type || ""}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              isLowStock ? "text-red-600 font-bold" : ""
                            }
                          >
                            {formatNumber(item.currentQuantity)}
                          </span>
                          {isLowStock && (
                            <Badge
                              variant="destructive"
                              className="ml-2 text-xs"
                            >
                              ต่ำ
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-gray-500">
                          {item.minQuantity !== null
                            ? formatNumber(item.minQuantity)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.averageCost !== null
                            ? formatCurrency(item.averageCost)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {item.location || "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(item)}
                          >
                            แก้ไข
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              แก้ไขข้อมูลสินค้า: {editingItem?.item.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>จำนวนขั้นต่ำ (Min)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editMinQuantity}
                  onChange={(e) => setEditMinQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <Label>จำนวนสูงสุด (Max)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editMaxQuantity}
                  onChange={(e) => setEditMaxQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label>ตำแหน่งจัดเก็บ</Label>
              <Input
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="เช่น ชั้น A-1"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
