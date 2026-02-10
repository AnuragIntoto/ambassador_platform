import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';

export interface FilterOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-filter-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    InputTextModule,
    ButtonModule,
    CheckboxModule,
  ],
  templateUrl: './filter-modal.html',
  styleUrl: './filter-modal.scss',
})
export class FilterModal {
  visible = input.required<boolean>();
  title = input.required<string>();
  searchPlaceholder = input<string>('');
  items = input<FilterOption[]>([]);
  selectedIds = input<string[]>([]);

  apply = output<string[]>();
  close = output<void>();

  search = signal('');
  selected = signal<Set<string>>(new Set());

  filteredItems = computed(() => {
    const list = this.items();
    const q = this.search().trim().toLowerCase();
    if (!q) return list;
    return list.filter((i) => i.label.toLowerCase().includes(q));
  });

  constructor() {
    effect(() => {
      const ids = this.selectedIds();
      this.selected.set(new Set(ids ?? []));
    });
  }

  onVisibleChange(show: boolean): void {
    if (!show) this.close.emit();
  }

  toggle(id: string, checked?: boolean): void {
    const s = new Set(this.selected());
    if (checked !== undefined) {
      if (checked) s.add(id);
      else s.delete(id);
    } else {
      if (s.has(id)) s.delete(id);
      else s.add(id);
    }
    this.selected.set(s);
  }

  isChecked(id: string): boolean {
    return this.selected().has(id);
  }

  clearAll(): void {
    this.selected.set(new Set());
  }

  onApply(): void {
    this.apply.emit(Array.from(this.selected()));
  }
}
