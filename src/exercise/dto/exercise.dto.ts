export class CreateExerciseDto {
  readonly post_id: number;
  readonly exercise_id: string;
  readonly name: string;
  readonly body_part: string;
  readonly equipment?: string;
  readonly target: string;
  readonly gif_url?: string;
  readonly secondaryMuscles: string[];
  
  // Sửa lại kiểu instructions để khớp với định dạng mảng đối tượng { step_number: instruction }
  readonly instructions: { [step_number: number]: string }[];
}
