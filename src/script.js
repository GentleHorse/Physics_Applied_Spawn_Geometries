import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as dat from 'lil-gui'
import * as CANNON from 'cannon-es'



//Settings ==================================================================

//--GUI---
const gui = new dat.GUI()
const debugObject = {}

debugObject.createSphere = () =>
{
    createSphere(
        Math.random() * 0.5, 
        {
            x: (Math.random() - 0.5) * 3, 
            y: 3, 
            z: (Math.random() - 0.5) * 3
        }
    )
}
debugObject.createBox = () =>
{
    createBox(
        Math.random(),
        Math.random(),
        Math.random(),
        {
            x: (Math.random() - 0.5) * 3,
            y: 3,
            z: (Math.random() - 0.5) * 3
        }
    )
}
gui.add(debugObject, 'createSphere')
gui.add(debugObject, 'createBox')


//---ENVIROMENT TEXTURE---
const textureLoader = new THREE.TextureLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()
const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
])


//---CANVAS----
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xa8def0);
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
window.addEventListener('resize', () =>
{
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

//---SOUNDS---
const hitSound = new Audio('/sounds/hit.mp3')
const playHitSound = (collision) => 
{
    const impactStrength = collision.contact.getImpactVelocityAlongNormal()
    
    if (impactStrength > 1.5)
    {
        hitSound.volume = Math.random()
        hitSound.currentTime = 0
        hitSound.play()
    }
}

//---CAMERA---
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(- 3, 3, 3)
scene.add(camera)

//---CONTROLS---
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

//---RENDERER---
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

//---LIGHTs---
light()

//---PHYSICS SETUP---

//------world
const world = new CANNON.World()
world.broadphase = new CANNON.SAPBroadphase(world)      //for better collision calc (CPU)
world.allowSleep = true                                 //for better collision calc (CPU)
world.gravity.set(0, -9.82, 0)

//------materials
const defaultMaterial = new CANNON.Material('default')
const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
        friction: 0.1,
        restitution: 0.8
    }
)
world.addContactMaterial(defaultContactMaterial)
world.defaultContactMaterial = defaultContactMaterial

//---FLOOR (+ physics)---
generateFloor()


//Placing objects ==================================================================


//--load glb model with animation
let mixer = null
new GLTFLoader().load('models/RobotExpressive.glb', (gltf) => {
    //load model
    const model = gltf.scene
    model.traverse((object) => {
        if (object.isMesh) object.castShadow = true
    })
    const scale = 0.4
    model.scale.set(scale, scale, scale)
    scene.add(model)

    //collision boarder
    const collisionBox = new THREE.Mesh(
        new THREE.BoxGeometry(1, 2, 1),
        new THREE.MeshStandardMaterial({ color:'0xff0000' })
    )
    collisionBox.position.y = 1
    collisionBox.material.wireframe = true
    scene.add(collisionBox)

    //cannon.js body
    const robotDimension = {x: 1, y: 2, z: 1}
    const shape = new CANNON.Box(new CANNON.Vec3(robotDimension.x * 0.5, robotDimension.y * 0.5, robotDimension.z * 0.5))
    const body = new CANNON.Body({
        mass: 0,
        position: new CANNON.Vec3(0, 0, 0),
        shape: shape,
        material: defaultMaterial
    })
    body.position.copy(collisionBox.position)
    world.addBody(body)

    //add animation
    console.log(gltf)

    mixer = new THREE.AnimationMixer(gltf.scene)
    const action = mixer.clipAction(gltf.animations[10])
    action.play() 
})




const loader = new FBXLoader()
loader.setPath('models/james/');loader.load('Ch06_nonPBR.fbx', (fbx) => {
  fbx.traverse(c => {
    c.castShadow = true
  })
  const scale = 0.02
  fbx.scale.set(scale, scale, scale)
  fbx.position.z = -1
  scene.add(fbx)
})



//--axesHelper
const axesHelper = new THREE.AxesHelper(2)
axesHelper.visible = false
scene.add(axesHelper)
gui.add(axesHelper, 'visible').name('axes - Helper')










//07 utils
const objectsToUpdate = []

//--sphere create function 
const sphereGeometry = new THREE.SphereGeometry(1, 20, 20)
const sphereMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture
})

const createSphere = (radius, position) => 
{
    //three.js
    const mesh = new THREE.Mesh(sphereGeometry,sphereMaterial)
    mesh.scale.set(radius, radius, radius)
    mesh.castShadow = true
    mesh.position.copy(position)
    scene.add(mesh)

    //cannon.js body
    const shape = new CANNON.Sphere(radius)
    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0, 0, 0),
        shape: shape,
        material: defaultMaterial
    })
    body.position.copy(position)
    body.addEventListener('collide', playHitSound)
    world.addBody(body)

    //save in objects to update
    objectsToUpdate.push({
        mesh: mesh,
        body: body
    })
}

//--box create function
const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
const boxMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture
})

const createBox = (width, height, depth, position) => 
{
    //three.js
    const mesh = new THREE.Mesh(boxGeometry, boxMaterial)
    mesh.scale.set(width, height, depth)
    mesh.castShadow = true
    mesh.position.copy(position)
    scene.add(mesh)
    
    //cannon.js body
    const shape = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.5, depth * 0.5))
    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0, 3, 0),
        shape: shape,
        material: defaultMaterial
    })
    body.position.copy(position)
    body.addEventListener('collide', playHitSound)
    world.addBody(body)

    objectsToUpdate.push({
        mesh: mesh,
        body: body
    })
}

//--control keys
const keysPressed = {}
document.addEventListener('keydown', (event)=> {
    (keysPressed)[event.key.toLowerCase()] = true
}, false)

document.addEventListener('keyup', (event)=> {
    (keysPressed)[event.key.toLowerCase()] = false
}, false)


//08 animate
const clock = new THREE.Clock()
let oldElapsedTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime


    //update physics world
    world.step(1/60, deltaTime, 3)

    for (const object of objectsToUpdate)
    {
        object.mesh.position.copy(object.body.position)
        object.mesh.quaternion.copy(object.body.quaternion)
    }

    //update mixer
    if (mixer != null)
    {
        mixer.update(deltaTime)
    }

    controls.update()
    renderer.render(scene, camera)
    window.requestAnimationFrame(tick)
}

tick()


function light() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.set(1024, 1024)
    directionalLight.shadow.camera.far = 15
    directionalLight.shadow.camera.left = - 7
    directionalLight.shadow.camera.top = 7
    directionalLight.shadow.camera.right = 7
    directionalLight.shadow.camera.bottom = - 7
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    const directionalLightCameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera)
    directionalLightCameraHelper.visible = false
    gui.add(directionalLightCameraHelper, 'visible').name('directionalLight - Helper')
    scene.add(directionalLightCameraHelper)
}

function setupPhysics() {

}

function generateFloor() {
    //---three.js---
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 30),
        new THREE.MeshStandardMaterial({
            color: '#777777',
            metalness: 0.3,
            roughness: 0.4,
            envMap: environmentMapTexture,
            envMapIntensity: 0.5
        })
    )
    floor.receiveShadow = true
    floor.rotation.x = - Math.PI * 0.5
    scene.add(floor)

    //---cannon.js---
    const floorShape = new CANNON.Plane()
    const floorBody = new CANNON.Body()
    floorBody.mass = 0
    floorBody.addShape(floorShape)
    floorBody.quaternion.setFromAxisAngle(
        new CANNON.Vec3(-1, 0, 0),
        Math.PI * 0.5
    )
    world.addBody(floorBody)
}