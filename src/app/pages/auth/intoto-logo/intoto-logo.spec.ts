import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntotoLogo } from './intoto-logo';

describe('IntotoLogo', () => {
  let component: IntotoLogo;
  let fixture: ComponentFixture<IntotoLogo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntotoLogo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IntotoLogo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
