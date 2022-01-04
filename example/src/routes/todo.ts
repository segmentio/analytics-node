import { Todo } from '../models/todo';
import express from 'express'
import analytics from '../configs/segment.config'


type RequestBody = {text: string}
type RequestParams = {todoId: string}
let todos: Todo[] = [];

const router = express.Router()


// Add todo
router.get('/', (req, res, next) => {
    analytics.identify({ userId: 'sandeep', traits: { plan: 'Free' } })
    analytics.track({ userId: 'sandeep', event: 'get todos', properties: { todos: todos}}) 
    res.status(200).json({todos: todos})
})

//Create todo
router.post('/todo', (req, res) => {
    //const body = req.body as { text: String}
    const body = req.body as RequestBody
    const newTodo: Todo = {
        id: new Date().toString(),
        text: body.text
    }

    analytics.identify({ userId: 'sandeep', traits: { plan: 'Free' } })
    analytics.track({ userId: 'sandeep', event: 'new todo', properties: {id: newTodo.id, text: newTodo.text} })     
    todos.push(newTodo)
    res.status(201).json({message: 'Added todo', todo: newTodo})
})

//Update todo
router.put('/todo/:todoId', (req, res) => {

    const tid = req.params.todoId
    
    const todoIndex = todos.findIndex(todoItem => todoItem.id == tid)
    console.log(todoIndex)

    if (todoIndex >= 0) {

        todos[todoIndex] = {
            id: todos[todoIndex].id,
            text: req.body.text
        }
        analytics.identify({ userId: 'sandeep', traits: { plan: 'Free' } })
        analytics.track({ userId: 'sandeep', event: 'update todo', properties: {id: todos[todoIndex].id, text: todos[todoIndex].text} })     
        return res.status(200).json({message: 'udpated todo', todos: todos})
    }

    res.status(404).json({message: 'Could not find todo for this id.'})

})

// Delete Todos
router.delete('/todo/:todoId', (req, res, next) => {
    const params = req.params as RequestParams
    const tid = params.todoId
    todos = todos.filter(todo => todo.id !== tid)
    res.status(201).json({message: 'Deleted requesred todo', todos: todos})
})


export default router