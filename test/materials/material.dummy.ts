import * as faker from 'faker'
import { random } from 'lodash'
import { Course, Exercise, Material, Topic } from '../../src/materials/entities'

export const createDummyMaterials = () => [
  Material.create({
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    levelStart: 1,
    levelEnd: 10,
    image: '',
  }),
  Material.create({
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    levelStart: 1,
    levelEnd: 10,
    image: '',
  }),
  Material.create({
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    levelStart: 1,
    levelEnd: 10,
    image: '',
  }),
  Material.create({
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    levelStart: 1,
    levelEnd: 10,
    image: '',
  }),
]

export const createDummyTopics = (material: Material) => [
  Topic.create({
    material,
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
  }),
  Topic.create({
    material,
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
  }),
  Topic.create({
    material,
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
  }),
  Topic.create({
    material,
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
  }),
]

export const createDummyCourses = (topic: Topic) => [
  Course.create({
    topic,
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    level: random(1, 10, false),
  }),
  Course.create({
    topic,
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    level: random(1, 10, false),
  }),
  Course.create({
    topic,
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    level: random(1, 10, false),
  }),
]

export const createDummyExercises = (course: Course) => [
  Exercise.create({
    course,
    index: 1,
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    text: faker.lorem.lines(5),
  }),
  Exercise.create({
    course,
    index: 2,
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    text: faker.lorem.lines(5),
  }),
  Exercise.create({
    course,
    index: 3,
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    text: faker.lorem.lines(5),
  }),
]
