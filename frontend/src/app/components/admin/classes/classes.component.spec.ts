import { ClassesComponent } from './classes.component';
import { ClassRecord } from '../../../models/classes.model';

describe('ClassesComponent', () => {
  it('keeps classes that share a name but belong to different schools or sections', () => {
    const records: ClassRecord[] = [
      { id: 1, schoolId: 10, schoolName: 'Alpha', name: 'IX', section: 'A' },
      { id: 2, schoolId: 20, schoolName: 'Beta', name: 'IX', section: 'A' },
      { id: 3, schoolId: 10, schoolName: 'Alpha', name: 'IX', section: 'B' },
    ];

    const merged = ClassesComponent.mergeClasses(records);

    expect(merged).toHaveSize(3);
    expect(merged.map((item) => item.id)).toEqual([1, 2, 3]);
  });
});
