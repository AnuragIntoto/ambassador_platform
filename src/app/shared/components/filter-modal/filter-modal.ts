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
  /** Show loading indicator at bottom when loading more (infinite scroll). */
  loadingMore = input<boolean>(false);

  apply = output<string[]>();
  close = output<void>();
  /** Emitted when user scrolls near bottom to load next page. */
  loadMore = output<void>();

  search = signal('');
  selected = signal<Set<string>>(new Set());

  filteredItems = computed(() => {
    const list = this.items();
    const q = this.search().trim().toLowerCase();
    if (!q) return list;
    return list.filter((i) => i.label.toLowerCase().includes(q));
  });

  /** True when at least one option is selected (used to style Clear All with teal bg). */
  hasSelection = computed(() => this.selected().size > 0);

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

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (!el || this.loadingMore()) return;
    const threshold = 80;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
    if (nearBottom) this.loadMore.emit();
  }
}
