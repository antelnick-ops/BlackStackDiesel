export interface Vehicle {
  id: number;
  name: string;
  year: number;
  make: string;
  model: string;
  engine: string;
  drivetrain: '2WD' | '4WD' | string;
  primary: boolean;
}
