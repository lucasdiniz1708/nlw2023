import { FastifyInstance } from "fastify"
import { prisma } from "./lib/prisma"
import { date, z } from 'zod'
import dayjs from 'dayjs'

export async function appRoutes(app: FastifyInstance) {
    app.post('/habits', async (request) => {

        const createHabitBody = z.object({
            title: z.string(),
            weekDays: z.array(z.number().min(0).max(6)
            )
        })


        const { title, weekDays } = createHabitBody.parse(request.body)
        const today = dayjs().startOf('day').toDate()

        await prisma.habit.create({
            data: {
                title,
                create_at: today,
                weekDays: {
                    create: weekDays.map(weekDay => {
                        return {
                            week_day: weekDay,
                        }
                    })
                }


            }
        })
    })

    app.get('/day', async (request) => {
        const getDayParams = z.object({
            date: z.coerce.date()
        })
        const { date } = getDayParams.parse(request.query)
        const parsedDate = dayjs(date).startOf('day')
        const weekDay = parsedDate.get('day')

        console.log(date, weekDay)

        const possibleHabits = await prisma.habit.findMany({
            where: {
                create_at: {
                    lte: date,
                },
                weekDays: {
                    some: {
                        week_day: weekDay
                    }
                }
            }

        })

        const day = await prisma.day.findUnique(
            {
                where: {
                    date: parsedDate.toDate(),
                },
                include: {
                    dayHabits: true
                }

            }
        )
        const completdHabits = day?.dayHabits.map(dayHabit => {
            return dayHabit.habit_id
        }) ?? []

        return {
            possibleHabits,
            completdHabits
        }

    })


    // complentar /não complentar um hábito 

    app.patch('/habits/:id/toggle', async (request) => {
        //route param => parametro de identificação

        const toggleHabitParams = z.object({
            id: z.string().uuid(),
        })

        const { id } = toggleHabitParams.parse(request.params)
        const today = dayjs().startOf('day').toDate()

        let day = await prisma.day.findUnique({
            where: {
                date: today,
            }
        })

        if (!day) {
            day = await prisma.day.create({
                data: {
                    date: today,
                }
            })
        }
        const dayHabit = await prisma.dayHabit.findUnique({
            where: {
                day_id_habit_id: {
                    day_id: day.id,
                    habit_id: id,

                }
            }
        })
        if (dayHabit) {
            console.log('oi')
            await prisma.dayHabit.delete({
                where: {
                    id: dayHabit.id
                }
            })
        }
        else {
            await prisma.dayHabit.create({
                data: {
                    day_id: day.id,
                    habit_id: id,
                }
            })

        }
        //completar o habito 
        await prisma.dayHabit.create({
            data: {
                day_id: day.id,
                habit_id: id,
            }
        })

    })

    app.get('/summary', async () => {

    const summary = await prisma.$queryRaw`
        SELECT 
        D.id, 
        D.date,
        (
            SELECT
            cast(count(*) as float)
            FROM day_habits DH 
            WHERE DH.day_id = D.id
        ) as completed,
        (
            SELECT
            cast(count(*) as float)
            FROM habit_week_days HWD 
            JOIN habits H
             ON H.id = HWD.habit_id
            WHERE
            HWD.week_day= cast (strftime('%w',D.date/1000.0,'unixepoch') as int )
            AND H.create_at <= D.date
        ) as amount
        FROM days D
    `
        return summary
    })

}

