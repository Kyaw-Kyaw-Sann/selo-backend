import { AppError } from '../../utils/app.error.js';
import * as unitsRepository from './units.repository.js'
import type { CreateUnitInput, ListUnitsQuery, UpdateUnitInput } from './units.schema.js';

export async function listUnits(query: ListUnitsQuery){
    const offset = (query.page - 1) * query.limit

    const result = await unitsRepository.listUnits(
        query.search,
        query.limit,
        offset
    )

    return {
        units: result.rows.map((row)=> ({
            id: row.id,
            name: row.name,
            code: row.code,
            isActive: Boolean(row.is_active)
        })),
        pagination: {
            page: query.page,
            limit: query.limit,
            total: result.total,
            totalPages: Math.ceil(result.total / query.limit)
        }
    }
}

export async function createUnit(input: CreateUnitInput){
    try{
        await unitsRepository.createUnit(input.name, input.code)
    }catch(error){
        if(
            error instanceof Error &&
            "code" in error &&
            error.code === "ER_DUP_ENTRY"
        ){
            throw new AppError(
                "Unit code already exists",
                409,
                "UNIT_CODE_EXISTS"
            )
        }

        throw error
    }

    const unit = await unitsRepository.getUnitByCode(input.code)

    if(!unit){
        throw new AppError(
         "Failed to retrieve created unit",
      500,
      "INTERNAL_SERVER_ERROR",
        )
    }

    return {
        id: unit.id,
        name: unit.name,
        code: unit.code,
        isActive: Boolean(unit.is_active)
    }

}

export async function updateUnit(id: string, input: UpdateUnitInput){
    try{
        await unitsRepository.updateUnit(id, input)
    }catch(error){
         if(
            error instanceof Error &&
            "code" in error &&
            error.code === "ER_DUP_ENTRY"
        ){
            throw new AppError(
                "Unit code already exists",
                409,
                "UNIT_CODE_EXISTS"
            )
        }

        throw error
    }

    const unit = await unitsRepository.getUnitById(id)

    if(!unit){
       throw new AppError("Unit not found", 404, "UNIT_NOT_FOUND");
    }

    return{
        id: unit.id,
        name: unit.name,
        code: unit.code,
        isActive: Boolean(unit.is_active)
    }
}

export async function updateUnitStatus(id: string, isActive: boolean){
    await unitsRepository.updateUnitStatus(id, isActive)

    const unit = await unitsRepository.getUnitById(id)

    if(!unit){
        throw new AppError("Unit not found", 404, "UNIT_NOT_FOUND");
    }

    return{
        id: unit.id,
        name: unit.name,
        code: unit.code,
        isActive: Boolean(unit.is_active)
    }
}

// CREATE TABLE units (
//     id BIGINT NOT NULL AUTO_INCREMENT,
//     name VARCHAR(80) NOT NULL,
//     code VARCHAR(30) NOT NULL,
//     is_active BOOLEAN NOT NULL DEFAULT TRUE,

//     PRIMARY KEY (id),
//     UNIQUE KEY uq_units_code (code)
// ) ENGINE = InnoDB;