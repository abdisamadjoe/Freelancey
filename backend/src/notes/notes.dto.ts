import { IsString, IsNotEmpty, MaxLength } from "class-validator";

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;
}
