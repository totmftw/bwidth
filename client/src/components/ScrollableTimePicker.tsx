import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse, isValid } from 'date-fns';

interface ScrollableColumnProps {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  width?: number;
  label?: string;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

function ScrollableColumn({ items, selectedIndex, onChange, width = 60, label }: ScrollableColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const isDragging = useRef(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update Y position when selectedItem changes externally
  useEffect(() => {
    if (!isDragging.current) {
      animate(y, -selectedIndex * ITEM_HEIGHT, { type: 'spring', stiffness: 300, damping: 30 });
    }
  }, [selectedIndex, y]);

  const snapToClosest = (currentY: number) => {
    const index = Math.round(-currentY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
    onChange(clampedIndex);
    return -clampedIndex * ITEM_HEIGHT;
  };

  if (!isClient) return null;

  return (
    <div className="flex flex-col items-center relative" style={{ width }}>
      {label && <span className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wider">{label}</span>}
      <div 
        className="relative overflow-hidden w-full select-none flex justify-center" 
        style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
        ref={containerRef}
      >
        {/* Selection highlight overlay */}
        <div 
          className="absolute left-0 right-0 pointer-events-none rounded-md bg-white/10"
          style={{ 
            top: ITEM_HEIGHT * 2, 
            height: ITEM_HEIGHT,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        />
        
        <motion.div
          drag="y"
          dragConstraints={{
            top: -(items.length - 1) * ITEM_HEIGHT,
            bottom: 0,
          }}
          dragElastic={0.2}
          onDragStart={() => {
            isDragging.current = true;
          }}
          onDragEnd={(_, info) => {
            isDragging.current = false;
            const targetY = y.get() + info.velocity.y * 0.1;
            const finalY = snapToClosest(targetY);
            animate(y, finalY, { type: 'spring', stiffness: 300, damping: 30 });
          }}
          style={{ y, touchAction: 'none' }}
          className="absolute w-full py-[80px]" // 2 items padding top/bottom
        >
          {items.map((item, i) => {
            // Apply scale/opacity effect based on distance from center
            return (
              <PickerItem 
                key={i} 
                item={item} 
                index={i} 
                y={y} 
                onClick={() => {
                  onChange(i);
                  animate(y, -i * ITEM_HEIGHT, { type: 'spring', stiffness: 300, damping: 30 });
                }} 
              />
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

const PickerItem = ({ item, index, y, onClick }: { item: string, index: number, y: any, onClick: () => void }) => {
  // calculate distance from center (y = 0 means index 0 is at center)
  const itemY = index * ITEM_HEIGHT;
  
  const opacity = useTransform(
    y,
    [-itemY - ITEM_HEIGHT * 2, -itemY, -itemY + ITEM_HEIGHT * 2],
    [0.3, 1, 0.3]
  );
  
  const scale = useTransform(
    y,
    [-itemY - ITEM_HEIGHT * 2, -itemY, -itemY + ITEM_HEIGHT * 2],
    [0.8, 1.1, 0.8]
  );
  
  const fontWeight = useTransform(
    y,
    [-itemY - ITEM_HEIGHT * 0.5, -itemY, -itemY + ITEM_HEIGHT * 0.5],
    [400, 700, 400]
  );

  return (
    <motion.div
      style={{
        height: ITEM_HEIGHT,
        opacity,
        scale,
        fontWeight
      }}
      className="flex items-center justify-center text-xl cursor-pointer"
      onClick={onClick}
    >
      {item}
    </motion.div>
  );
};

interface ScrollableTimePickerProps {
  value: string; // HH:mm format (24h)
  onChange: (time: string) => void;
  className?: string;
  disabled?: boolean;
}

export function ScrollableTimePicker({ value, onChange, className, disabled }: ScrollableTimePickerProps) {
  const [open, setOpen] = useState(false);

  // Parse a HH:mm 24h string into picker state
  const parseTime = (timeStr: string) => {
    try {
      if (!timeStr) return { h: 12, m: 0, isAm: false };
      const [hStr, mStr] = timeStr.split(':');
      let hour24 = parseInt(hStr, 10);
      const min = parseInt(mStr, 10) || 0;
      const isAm = hour24 < 12;
      let hour12 = hour24 % 12;
      if (hour12 === 0) hour12 = 12;
      return { h: hour12, m: min, isAm };
    } catch (e) {
      return { h: 12, m: 0, isAm: false };
    }
  };

  const initialParsed = parseTime(value);
  const [selectedHour, setSelectedHour] = useState(initialParsed.h);
  const [selectedMinute, setSelectedMinute] = useState(initialParsed.m);
  const [isAm, setIsAm] = useState(initialParsed.isAm);

  // Text input state — shows a human-readable string while editing
  const displayTime = useMemo(() => {
    if (!value) return "";
    try {
      const d = parse(value, 'HH:mm', new Date());
      return isValid(d) ? format(d, 'h:mm a') : value;
    } catch {
      return value;
    }
  }, [value]);

  const [inputText, setInputText] = useState(displayTime);

  // Keep inputText in sync with external value, but only when the user is not actively editing
  const inputFocused = useRef(false);
  useEffect(() => {
    if (!inputFocused.current) {
      setInputText(displayTime);
    }
  }, [displayTime]);

  // Sync scroll-picker internal state when popover opens
  useEffect(() => {
    if (open && value) {
      const parsed = parseTime(value);
      setSelectedHour(parsed.h);
      setSelectedMinute(parsed.m);
      setIsAm(parsed.isAm);
    }
  }, [open, value]);

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  const amPm = ['AM', 'PM'];

  const hourIndex = hours.findIndex(h => parseInt(h, 10) === selectedHour);
  const minuteIndex = Math.max(0, minutes.findIndex(m => parseInt(m, 10) >= selectedMinute));

  const handleApply = () => {
    let hour24 = selectedHour;
    if (isAm && hour24 === 12) hour24 = 0;
    if (!isAm && hour24 < 12) hour24 += 12;
    const formatted = `${String(hour24).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    onChange(formatted);
    setOpen(false);
  };

  // Attempt to parse a user-typed time string and commit it via onChange.
  // Accepts formats: "9:30 PM", "9:30PM", "9:30 pm", "21:30", "9:30", "930pm"
  const commitTextInput = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      onChange("");
      return;
    }

    // Try parsing several natural formats with date-fns
    const formats = ['h:mm a', 'h:mma', 'H:mm', 'hhmm a', 'HH:mm'];
    for (const fmt of formats) {
      try {
        const d = parse(trimmed, fmt, new Date());
        if (isValid(d)) {
          onChange(format(d, 'HH:mm'));
          return;
        }
      } catch {
        // continue trying formats
      }
    }

    // Fallback: try matching raw patterns like "930pm", "9pm", "21:30"
    const match = trimmed.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2] ? parseInt(match[2], 10) : 0;
      const meridiem = match[3]?.toLowerCase();
      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        return;
      }
    }

    // Input was not parseable — revert displayed text to last known good value
    setInputText(displayTime);
  }, [onChange, displayTime]);

  return (
    <div className={cn("flex items-center gap-1 w-full", disabled && "opacity-50 pointer-events-none")}>
      {/* Direct text input for keyboard entry */}
      <div className="relative flex-1">
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={inputText}
          placeholder="e.g. 9:30 PM"
          disabled={disabled}
          className={cn(
            "pl-9 bg-background/50 h-11",
            className
          )}
          onFocus={() => {
            inputFocused.current = true;
          }}
          onChange={(e) => {
            setInputText(e.target.value);
          }}
          onBlur={(e) => {
            inputFocused.current = false;
            commitTextInput(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              inputFocused.current = false;
              commitTextInput((e.target as HTMLInputElement).value);
            }
          }}
        />
      </div>

      {/* Scroll picker trigger — compact clock button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            className="h-11 w-11 shrink-0 bg-background/50"
            aria-label="Open time picker"
          >
            <Clock className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4 flex flex-col items-center gap-4 bg-[#111116] border-white/10 shadow-xl rounded-xl z-[100]">
          <div className="flex bg-black/40 p-2 rounded-xl backdrop-blur-md border border-white/5">
            <ScrollableColumn
              label="hr"
              items={hours}
              selectedIndex={hourIndex >= 0 ? hourIndex : 11}
              onChange={(idx) => setSelectedHour(parseInt(hours[idx], 10))}
            />
            <div className="flex flex-col items-center justify-center font-bold text-2xl mx-1 select-none">:</div>
            <ScrollableColumn
              label="min"
              items={minutes}
              selectedIndex={minuteIndex}
              onChange={(idx) => setSelectedMinute(parseInt(minutes[idx], 10))}
            />
            <div className="w-2" />
            <ScrollableColumn
              label="am/pm"
              items={amPm}
              selectedIndex={isAm ? 0 : 1}
              onChange={(idx) => setIsAm(idx === 0)}
              width={70}
            />
          </div>
          <div className="flex gap-2 w-full mt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleApply}>Done</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
