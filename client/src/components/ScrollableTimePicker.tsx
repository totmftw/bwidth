import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';

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
  
  // Parse incoming value
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

  // Sync internal state when external value changes
  useEffect(() => {
    if (!open && value) {
      const parsed = parseTime(value);
      setSelectedHour(parsed.h);
      setSelectedMinute(parsed.m);
      setIsAm(parsed.isAm);
    }
  }, [value, open]);

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  // 5-minute increments
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  const amPm = ['AM', 'PM'];

  const hourIndex = hours.findIndex(h => parseInt(h, 10) === selectedHour);
  const minuteIndex = Math.max(0, minutes.findIndex(m => parseInt(m, 10) >= selectedMinute)); // Snap to closest 5min

  const handleApply = () => {
    let hour24 = selectedHour;
    if (isAm && hour24 === 12) hour24 = 0;
    if (!isAm && hour24 < 12) hour24 += 12;
    
    const formatted = `${String(hour24).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    onChange(formatted);
    setOpen(false);
  };

  const displayTime = useMemo(() => {
    if (!value) return "Pick time";
    try {
      const d = parse(value, 'HH:mm', new Date());
      return format(d, 'h:mm a');
    } catch {
      return value;
    }
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal bg-background/50",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayTime}
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
  );
}
