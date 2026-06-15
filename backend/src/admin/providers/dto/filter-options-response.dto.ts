import { ApiProperty } from '@nestjs/swagger';

export class FilterOptionPersonDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class ActiveProvidersFilterOptionsDto {
  @ApiProperty({ type: [FilterOptionPersonDto] })
  recruiters!: FilterOptionPersonDto[];

  @ApiProperty({ type: [FilterOptionPersonDto] })
  liaisons!: FilterOptionPersonDto[];

  @ApiProperty({ type: [String] })
  states!: string[];

  @ApiProperty({ type: [String] })
  cities!: string[];

  @ApiProperty({ type: [String] })
  regions!: string[];

  @ApiProperty({ type: [String] })
  specialties!: string[];

  @ApiProperty({ type: [String] })
  employmentTypes!: string[];
}
