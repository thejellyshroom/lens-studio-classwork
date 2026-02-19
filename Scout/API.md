Lens Scripting API
Editor Scripting API
Guide Docs


Full API List
Full API List
Built-In
Anchor
location: LocationAsset
position: vec3
AnimatedTextureFileProvider
clone(): AnimatedTextureFileProvider
duration: number
getCurrentPlayingFrame(): number
getDuration(): number
getFramesCount(): number
isAutoplay: boolean
isFinished(): boolean
isPaused(): boolean
isPingPong: boolean
isPlaying(): boolean
isReversed: boolean
pause(): void
pauseAtFrame(frameIndex: number): void
play(loops: number, offset: number): void
playFromFrame(frameIndex: number, loops: number): void
resume(): void
setOnFinish(eventCallback: (animatedTexture: AnimatedTextureFileProvider) => void): void
stop(): void
track: IntStepAnimationTrackKeyFramed
Animation
getAnimationLayerByName(layerName: string): AnimationLayer
removeAnimationLayerByName(layerName: string): void
setAnimationLayerByName(layerName: string, animationLayer: AnimationLayer): void
AnimationAsset
addLayer(layerName: string, layer: AnimationPropertyLayer): void
clearLayers(): void
create(): AnimationAsset
createEvent(eventName: string, time: number): AnimationPropertyEventRegistration
deleteEvent(registration: AnimationPropertyEventRegistration): void
deleteLayer(layerName: string): void
duration: number
fps: number
getLayer(layerName: string): AnimationPropertyLayer
AnimationClip
animation: AnimationAsset
begin: number
blendMode: AnimationLayerBlendMode
clone(clipName: string): AnimationClip
create(clipName: string): AnimationClip
createFromAnimation(clipName: string, animation: AnimationAsset): AnimationClip
disabled: boolean
duration: number
end: number
name: string
offset: number
playbackMode: PlaybackMode
playbackSpeed: number
reversed: boolean
scaleMode: AnimationLayerScaleMode
weight: number
AnimationClip
PostInfinity
Cycle: number
Oscillate: number
RangeType
Frames: number
Time: number
AnimationCurve
addKeyframe(frame: AnimationKeyFrame): void
create(): AnimationCurve
createEasingCurve(startValue: number, endValue: number, x1: number, y1: number, x2: number, y2: number): AnimationCurve
createKeyFrame(): AnimationKeyFrame
evaluate(time: number): number
getKeyFrame(index: number): AnimationKeyFrame
keyFrameCount: number
removeKeyFrame(t: number): void
AnimationCurveTrack
create(name: string): AnimationCurveTrack
evaluateNumber(time: number): number
evaluateRotation(time: number): quat
evaluateVec2(time: number): vec2
evaluateVec3(time: number): vec3
evaluateVec4(time: number): vec4
getProperties(): AnimationCurve[]
getProperty(key: string): AnimationCurve
getPropertyKeys(): string[]
setProperty(key: string, curve: AnimationCurve): void
AnimationKeyFrame
inWeightPoint: vec2
leftTangentType: TangentType
outWeightPoint: vec2
rightTangentType: TangentType
time: number
value: number
weightedMode: WeightedMode
AnimationLayer
getBlendShapeTrack(shapeName: string): FloatAnimationTrack
position: Vec3AnimationTrack
rotation: QuaternionAnimationTrack
scale: Vec3AnimationTrack
setBlendShapeTrack(shapeName: string, track: FloatAnimationTrack): void
visibility: IntAnimationTrack
AnimationLayerBlendMode
Additive: number
Default: number
AnimationLayerScaleMode
Additive: number
Multiply: number
AnimationMixer
autoplay: boolean
cloneLayer(name: string, newName: string): AnimationMixerLayer
createClip(name: string): AnimationMixerLayer
getAnimationLayerNames(): string[]
getLayer(name: string): AnimationMixerLayer
getLayerTime(name: string): number
getLayers(): AnimationMixerLayer[]
pause(name: string): void
resetAnimations(): void
resume(name: string): void
setWeight(name: string, weight: number): void
speedRatio: number
start(name: string, offset: number, cycles: number): void
startWithCallback(name: string, offset: number, cycles: number, eventCallback: (name: string, animationMixer: AnimationMixer) => void): void
stop(name: string): void
AnimationMixerLayer
animationLayerName: string
blendMode: AnimationLayerBlendMode
clone(newName: string): AnimationMixerLayer
cycles: number
disabled: boolean
fps: number
from: number
getDuration(): number
getTime(): number
isPlaying(): boolean
name: string
pause(): void
postInfinity: AnimationClip.PostInfinity
rangeType: AnimationClip.RangeType
resume(): void
reversed: boolean
scaleMode: AnimationLayerScaleMode
speedRatio: number
start(offset: number, cycles: number): void
startWithCallback(offset: number, cycles: number, eventCallback: (name: string, animationMixer: AnimationMixer) => void): void
stop(): void
to: number
weight: number
AnimationPlayer
addClip(clip: AnimationClip): void
clips: AnimationClip[]
forceUpdate(deltaTime: number): void
getActiveClips(): string[]
getClip(name: string): AnimationClip
getClipCurrentTime(name: string): number
getClipEnabled(name: string): boolean
getClipIsPlaying(name: string): boolean
getInactiveClips(): string[]
onEvent: event1
pauseAll(): void
pauseClip(name: string): void
playAll(): void
playClip(name: string): void
playClipAt(name: string, time: number): void
removeClip(name: string): void
resumeAll(): void
resumeClip(name: string): void
setClipEnabled(name: string, enabled: boolean): void
stopAll(): void
stopClip(name: string): void
AnimationPlayerOnEventArgs
eventName: string
AnimationPropertyEventRegistration
AnimationPropertyLayer
BlendShapes: string
TransformPosition: string
TransformRotation: string
TransformScale: string
VertexCache: string
Visibility: string
create(): AnimationPropertyLayer
getProperty(name: string): AnimationPropertyTrack
removeProperty(name: string): void
renameProperty(oldName: string, newName: string): void
setCustomProperty(name: string, property: AnimationPropertyTrack, callback: (name: string, value: number|vec3|quat) => void): void
setProperty(name: string, property: AnimationPropertyTrack): void
AnimationPropertyTrack
addKeyFrame(channels: AnimationKeyFrame[], t: number): void
createFloatFromCurves(x: AnimationCurve): AnimationPropertyTrack
createQuatFromCurves(x: AnimationCurve, y: AnimationCurve, z: AnimationCurve): AnimationPropertyTrack
createVec3FromCurves(x: AnimationCurve, y: AnimationCurve, z: AnimationCurve): AnimationPropertyTrack
removeKeyFrame(t: number): void
AnimationTrack
AsrModule
startTranscribing(transcriptionOptions: AsrModule.AsrTranscriptionOptions): void
stopTranscribing(streamType: number): Promise
AsrModule
AsrMode
Balanced: number
HighAccuracy: number
HighSpeed: number
AsrStatusCode
InternalError: number
NoInternet: number
Success: number
Unauthenticated: number
AsrTranscriptionOptions
mode: AsrModule.AsrMode
onTranscriptionErrorEvent: event1
onTranscriptionUpdateEvent: event1
silenceUntilTerminationMs: number
create(): AsrModule.AsrTranscriptionOptions
TranscriptionUpdateEvent
isFinal: boolean
text: string
create(): AsrModule.TranscriptionUpdateEvent
Asset
name: string
AttachmentPointType
CandideCenter: number
Chin: number
Forehead: number
HeadCenter: number
LeftCheek: number
LeftEyeballCenter: number
LeftForehead: number
MouthCenter: number
RightCheek: number
RightEyeballCenter: number
RightForehead: number
TriangleBarycentric: number
Audio
DistanceCurveType
Inverse: number
InverseLogarithm: number
Linear: number
Logarithm: number
PlaybackMode
LowLatency: number
LowPower: number
AudioComponent
audioTrack: AudioTrackAsset
duration: number
fadeInTime: number
fadeOutTime: number
isPaused(): boolean
isPlaying(): boolean
mixToSnap: boolean
pause(): boolean
play(loops: number): void
playbackMode: Audio.PlaybackMode
position: number
recordingVolume: number
resume(): boolean
setOnFinish(eventCallback: (audioComponent: AudioComponent) => void): void
spatialAudio: SpatialAudio
stop(fade: boolean): void
volume: number
AudioEffectAsset
AudioEffectComponent
AudioEffectProvider
AudioListenerComponent
AudioOutputProvider
enqueueAudioFrame(audioFrame: Float32Array, inShape: vec3): void
getPreferredFrameSize(): number
AudioTrackAsset
control: AudioTrackProvider
AudioTrackProvider
maxFrameSize: number
sampleRate: number
Axis
X: number
Y: number
Z: number
BackgroundSettings
cornerRadius: number
enabled: boolean
fill: TextFill
margins: Rect
Base64
decode(value: string): Uint8Array
decodeTextureAsync(value: string, onSuccess: (decodedTexture: Texture) => void, onFailure: () => void): void
encode(data: Uint8Array): string
encodeString(str: string): string
encodeTextureAsync(texture: Texture, onSuccess: (encodedTexture: string) => void, onFailure: () => void, compressionQuality: CompressionQuality, encodingType: EncodingType): void
BaseMeshVisual
extentsTarget: ScreenTransform
horizontalAlignment: HorizontalAlignment
localAabbMax(): vec3
localAabbMin(): vec3
meshShadowMode: MeshShadowMode
shadowColor: vec4
shadowDensity: number
snap(camera: Camera): void
stretchMode: StretchMode
verticalAlignment: VerticalAlignment
worldAabbMax(): vec3
worldAabbMin(): vec3
BaseMultiplayerSessionOptions
hostManagementEnabled: boolean
onConnected: (session: MultiplayerSession, connectionInfo: ConnectedLensModule.ConnectionInfo) => void
onDisconnected: (session: MultiplayerSession, disconnectInfo: string) => void
onError: (session: MultiplayerSession, code: string, description: string) => void
onHostUpdated: (session: MultiplayerSession, removalInfo: ConnectedLensModule.HostUpdateInfo) => void
onMessageReceived: (session: MultiplayerSession, userId: string, message: string, senderInfo: ConnectedLensModule.UserInfo) => void
onRealtimeStoreCreated: (session: MultiplayerSession, store: GeneralDataStore, ownerInfo: ConnectedLensModule.UserInfo, creationInfo: ConnectedLensModule.RealtimeStoreCreationInfo) => void
onRealtimeStoreDeleted: (session: MultiplayerSession, store: GeneralDataStore, deleteInfo: ConnectedLensModule.RealtimeStoreDeleteInfo) => void
onRealtimeStoreKeyRemoved: (session: MultiplayerSession, removalInfo: ConnectedLensModule.RealtimeStoreKeyRemovalInfo) => void
onRealtimeStoreOwnershipUpdated: (session: MultiplayerSession, store: GeneralDataStore, ownerInfo: ConnectedLensModule.UserInfo, ownershipUpdateInfo: ConnectedLensModule.RealtimeStoreOwnershipUpdateInfo) => void
onRealtimeStoreUpdated: (session: MultiplayerSession, store: GeneralDataStore, key: string, updateInfo: ConnectedLensModule.RealtimeStoreUpdateInfo) => void
onUserJoinedSession: (session: MultiplayerSession, userInfo: ConnectedLensModule.UserInfo) => void
onUserLeftSession: (session: MultiplayerSession, userInfo: ConnectedLensModule.UserInfo) => void
BasePlaceholder
dataLayout: MachineLearning.DataLayout
internalDataLayout: MachineLearning.DataLayout
name: string
shape: vec3
transformer: Transformer
BasicTransform
getInvertedMatrix(): mat4
getMatrix(): mat4
getPosition(): vec3
getRotation(): quat
getScale(): vec3
BinAsset
Bitmoji2DOptions
create(): Bitmoji2DOptions
poseId: string
user: SafeSnapchatUser
Bitmoji2DResource
Bitmoji3DOptions
animationParams: Bitmoji3DOptions.AnimationParams
create(): Bitmoji3DOptions
customParams: Bitmoji3DOptions.CustomParams
optimizationParams: Bitmoji3DOptions.OptimizationParams
requestType: Bitmoji3DOptions.RequestType
user: SafeSnapchatUser
Bitmoji3DOptions
AnimationParams
create(): Bitmoji3DOptions.AnimationParams
AvatarScope
Body: number
Clothes: number
Full: number
Glasses: number
GlassesWithSkeleton: number
Hair: number
Hathair: number
Head: number
MannequinEarLeft: number
MannequinEarRight: number
MannequinHead: number
MannequinHeadFeatureless: number
MannequinHeadFeaturelessWithBody: number
Piercing: number
Unset: number
BaseBodyParams
bodyType: Bitmoji3DOptions.BodyType
breastType: Bitmoji3DOptions.BreastType
gender: Bitmoji3DOptions.Gender
create(): Bitmoji3DOptions.BaseBodyParams
BodyType
FemaleAverage: number
FemaleFit: number
FemaleHeavier: number
FemaleHeaviest: number
FemaleHeavy: number
FemaleHourGlassBodyBuilder: number
FemalePearAverage: number
FemalePearXXL: number
FemaleSlim: number
MaleAverage: number
MaleFit: number
MaleHeavier: number
MaleHeaviest: number
MaleHeavy: number
MaleHourGlassBodyBuilder: number
MalePearsoft: number
MaleRectanglePowerLifter: number
MaleSlim: number
BreastType
Average: number
Larger: number
Smaller: number
ClothingType
DetailedFullOutfit: number
FullOutfit: number
GranularClothes: number
SplitClothes: number
Unset: number
CustomParams
avatarScope: Bitmoji3DOptions.AvatarScope
bag: Bitmoji3DOptions.ParamSet
bottomWear: Bitmoji3DOptions.ParamSet
clothingType: Bitmoji3DOptions.ClothingType
cranium: string
footWear: Bitmoji3DOptions.ParamSet
glasses: string
hat: Bitmoji3DOptions.ParamSet
outerWear: Bitmoji3DOptions.ParamSet
sock: Bitmoji3DOptions.ParamSet
top: Bitmoji3DOptions.ParamSet
create(): Bitmoji3DOptions.CustomParams
Gender
Female: number
Male: number
Unknown: number
OptimizationParams
meshQuality: number
textureQuality: number
create(): Bitmoji3DOptions.OptimizationParams
ParamSet
optionId: string
params:
create(): Bitmoji3DOptions.ParamSet
RequestType
Animation: number
Avatar: number
Custom: number
Bitmoji3DResource
BitmojiModule
requestBaseBitmoji3DResourceWithOptions(options: Bitmoji3DOptions, baseBodyParams: Bitmoji3DOptions.BaseBodyParams, callback: (resource: Bitmoji3DResource) => void): void
requestBitmoji2DResource(options: Bitmoji2DOptions, callback: (resource: Bitmoji2DResource) => void): void
requestBitmoji3DResource(callback: (resource: Bitmoji3DResource) => void): void
requestBitmoji3DResourceWithOptions(options: Bitmoji3DOptions, callback: (resource: Bitmoji3DResource) => void): void
BlendMode
Add: number
AddLegacy: number
AlphaTest: number
AlphaToCoverage: number
ColoredGlass: number
Disabled: number
Max: number
Min: number
Multiply: number
MultiplyLegacy: number
Normal: number
PremultipliedAlpha: number
PremultipliedAlphaAuto: number
PremultipliedAlphaHardware: number
Screen: number
BlendShapes
blendNormals: boolean
clearBlendShapes(): void
getBlendShape(name: string): number
hasBlendShape(name: string): boolean
setBlendShape(name: string, weight: number): void
unsetBlendShape(name: string): void
Blob
bytes(): Promise
size: number
text(): Promise
type: string
Bluetooth
BluetoothCentralModule
onBluetoothStatusChangedEvent: event1
status: Bluetooth.BluetoothStatus
connectGatt(deviceAddress: Uint8Array): Promise
startScan(filters: Bluetooth.ScanFilter[], settings: Bluetooth.ScanSettings, predicate: (result: Bluetooth.ScanResult) => any): Promise
stopScan(): Promise
BluetoothGatt
connectionState: Bluetooth.ConnectionState
mtu: number
onConnectionStateChangedEvent: event1
onMtuChangedEvent: event1
close(): void
connect(): void
disconnect(): void
getService(serviceUUID: string): Bluetooth.BluetoothGattService
getServices(): Bluetooth.BluetoothGattService[]
BluetoothGattCharacteristic
properties: Bluetooth.CharacteristicProperty[]
uuid: string
getDescriptor(descriptorUUID: string): Bluetooth.BluetoothGattDescriptor
getDescriptors(): Bluetooth.BluetoothGattDescriptor[]
readValue(): Promise
registerNotifications(callback: (value: Uint8Array) => void): Promise
unregisterNotifications(): Promise
writeValue(value: Uint8Array): Promise
writeValueWithoutResponse(value: Uint8Array): Promise
BluetoothGattDescriptor
uuid: string
readValue(): Promise
writeValue(value: Uint8Array): Promise
BluetoothGattService
uuid: string
getCharacteristic(characteristicUUID: string): Bluetooth.BluetoothGattCharacteristic
getCharacteristics(): Bluetooth.BluetoothGattCharacteristic[]
BluetoothStatus
Available: number
PermissionDenied: number
Unavailable: number
Unknown: number
BluetoothStatusChangedEvent
status: Bluetooth.BluetoothStatus
CharacteristicProperty
Broadcast: number
ExtendedProps: number
Indicate: number
IndicateEncryptionRequired: number
Notify: number
NotifyEncryptionRequired: number
Read: number
SignedWrite: number
Write: number
WriteWithoutResponse: number
ConnectionState
Connected: number
Disconnected: number
ConnectionStateChangedEvent
state: Bluetooth.ConnectionState
MtuChangedEvent
mtu: number
ScanFilter
deviceName: string
manufacturerDataPrefix: Uint8Array
manufacturerId: number
serviceUUID: string
ScanMode
Balanced: number
LowLatency: number
LowPower: number
Opportunistic: number
Unset: number
ScanResult
deviceAddress: Uint8Array
deviceName: string
isConnectable: boolean
manufacturerData:
manufacturerId: number
rssi: number
serviceData:
txPower: number
ScanSettings
scanMode: Bluetooth.ScanMode
timeoutSeconds: number
uniqueDevices: boolean
BlurNoiseEstimation
BodyComponent
addForce(force: vec3, mode: Physics.ForceMode): void
addForceAt(force: vec3, offset: vec3, mode: Physics.ForceMode): void
addPointConstraint(target: ColliderComponent, position: vec3): ConstraintComponent
addRelativeForce(force: vec3, mode: Physics.ForceMode): void
addRelativeForceAt(force: vec3, position: vec3, mode: Physics.ForceMode): void
addRelativeTorque(torque: vec3, mode: Physics.ForceMode): void
addTorque(torque: vec3, mode: Physics.ForceMode): void
angularDamping: number
damping: number
density: number
dynamic: boolean
mass: number
removeConstraint(constraint: ConstraintComponent): void
BodyDepthTextureProvider
bodyIndex: number
minimumConfidence: number
trackingScope: PersonTrackingScope
zFar: number
zNear: number
BodyInstanceSegmentationTextureProvider
bodyIndex: number
invertMask: boolean
refineEdge: boolean
trackingScope: PersonTrackingScope
BodyNormalsTextureProvider
bodyIndex: number
trackingScope: PersonTrackingScope
BodyRenderObjectProvider
bodyGeometryEnabled: boolean
bodyIndex: number
headGeometryEnabled: boolean
leftHandGeometryEnabled: boolean
rightHandGeometryEnabled: boolean
trackingScope: PersonTrackingScope
BodyTrackingAsset
Head: string
Hips: string
LeftArm: string
LeftFoot: string
LeftForeArm: string
LeftHand: string
LeftHandIndex1: string
LeftHandIndex2: string
LeftHandIndex3: string
LeftHandMiddle1: string
LeftHandMiddle2: string
LeftHandMiddle3: string
LeftHandPinky1: string
LeftHandPinky2: string
LeftHandPinky3: string
LeftHandRing1: string
LeftHandRing2: string
LeftHandRing3: string
LeftHandThumb1: string
LeftHandThumb2: string
LeftHandThumb3: string
LeftLeg: string
LeftShoulder: string
LeftToeBase: string
LeftUpLeg: string
Neck: string
RightArm: string
RightFoot: string
RightForeArm: string
RightHand: string
RightHandIndex1: string
RightHandIndex2: string
RightHandIndex3: string
RightHandMiddle1: string
RightHandMiddle2: string
RightHandMiddle3: string
RightHandPinky1: string
RightHandPinky2: string
RightHandPinky3: string
RightHandRing1: string
RightHandRing2: string
RightHandRing3: string
RightHandThumb1: string
RightHandThumb2: string
RightHandThumb3: string
RightLeg: string
RightShoulder: string
RightToeBase: string
RightUpLeg: string
Spine: string
Spine1: string
Spine2: string
handTrackingEnabled: boolean
trackingScope: PersonTrackingScope
BoxShape
size: vec3
BrowsLoweredEvent
BrowsRaisedEvent
BrowsReturnedToNormalEvent
Camera
addRenderLayer(id: number): void
aspect: number
checkRenderLayer(id: number): boolean
clearColor: vec4
colorRenderTargets: Camera.ColorRenderTarget[]
createColorRenderTarget(): Camera.ColorRenderTarget
createDepthStencilRenderTarget(): Camera.DepthStencilRenderTarget
depthBufferMode: Camera.DepthBufferMode
depthStencilRenderTarget: Camera.DepthStencilRenderTarget
depthStencilRenderTargetSupported(): boolean
devicePropertiesSource: TextureTrackingScope
devicePropertyUsage: Camera.DeviceProperty
enableClearColor: boolean
enableClearDepth: boolean
far: number
fov: number
getAllRenderLayers(): number[]
getOrthographicSize(): vec2
getProjectionMatrix(): mat4
getSupportedColorRenderTargetCount(): number
getViewMatrix(): mat4
getViewProjectionMatrix(): mat4
inputTexture: Texture
isPhysical: boolean
isSphereVisible(center: vec3, radius: number): boolean
maskTexture: Texture
near: number
project(worldSpacePoint: vec3): vec3
rayTracing: any
removeRenderLayer(id: number): void
renderLayer: LayerSet
renderOrder: number
renderTarget: Texture
renderTargetCubemapFace: Camera.CubemapFace
renderTargetMipmapLevel: number
renderTargetSlice: number
screenSpaceToWorldSpace(normalizedScreenSpacePoint: vec2, absoluteDepth: number): vec3
size: number
supportedColorRenderTargetCount: number
type: Camera.Type
unproject(clipSpacePoint: vec3): vec3
worldSpaceToScreenSpace(worldSpacePoint: vec3): vec2
Camera
BaseRenderTarget
inputTexture: Texture
maskTexture: Texture
targetTexture: Texture
ColorRenderTarget
clearColor: vec4
clearColorOption: ClearColorOption
CubemapFace
Back: number
Bottom: number
Front: number
Left: number
NegativeX: number
NegativeY: number
NegativeZ: number
PositiveX: number
PositiveY: number
PositiveZ: number
Right: number
Top: number
DepthBufferMode
Logarithmic: number
Regular: number
DepthStencilRenderTarget
clearDepthValue: number
clearStencilValue: number
depthClearOption: DepthClearOption
stencilClearOption: StencilClearOption
DeviceProperty
All: number
Aspect: number
Fov: number
None: number
Type
Orthographic: number
Perspective: number
CameraBackEvent
CameraFrame
timestampSeconds: number
CameraFrontEvent
CameraModule
createCameraRequest(): CameraModule.CameraRequest
createImageRequest(): CameraModule.ImageRequest
getSupportedImageResolutions(): vec2[]
requestCamera(request: CameraModule.CameraRequest): Texture
requestImage(request: CameraModule.ImageRequest): Promise
CameraModule
CameraId
Default_Color: number
Left_Color: number
Right_Color: number
CameraRequest
cameraId: CameraModule.CameraId
imageSmallerDimension: number
ImageRequest
crop: Rect
resolution: vec2
CameraRollMedia
isSameMedia(other: CameraRollMedia): boolean
mediaId: number
mediaType: CameraRollMediaType
resource: DynamicResource
CameraRollMediaType
Image: number
Unset: number
Video: number
CameraRollModule
getDefaultSelectionLimit(): number
getMaxSelectionLimit(): number
hideMediaPicker(): void
onSelectionsUpdated: event1
selectedMedia: CameraRollMedia[]
showMediaPicker(options: CameraRollModule.ShowOptions): void
CameraRollModule
ShowOptions
selectionLimit: number
showImages: boolean
showVideos: boolean
CameraTextureProvider
onNewFrame: event1
Canvas
getSize(): vec2
pivot: vec2
setSize(value: vec2): void
sortingType: Canvas.SortingType
unitType: Canvas.UnitType
worldSpaceRect: Rect
Canvas
SortingType
Depth: number
Hierarchy: number
UnitType
Pixels: number
Points: number
World: number
CapitilizationOverride
AllLower: number
AllUpper: number
None: number
CapsuleShape
axis: Axis
length: number
radius: number
ClearColorOption
Background: number
CustomColor: number
CustomTexture: number
None: number
ClearDepth
ClothVisual
addCollider(colliderComponent: ColliderComponent): void
bendMode: ClothVisual.BendMode
bendStiffness: number
bendStiffnessVertexWeight: number
clearColliders(): void
colliders: ColliderComponent[]
createVertexSettings(): VertexSimulationSettings
externalBodyMeshWeight: number
friction: number
frictionVertexWeight: number
getAllColors(): vec4[]
getPointColorByIndex(index: number): vec4
getPointIndicesByColor(color: vec4, colorMask: vec4b): number[]
getPointIndicesByMask(colorMask: vec4b): number[]
getVertexBinding(index: number): SceneObject
getVertexSettings(index: number): VertexSimulationSettings
gravity: vec3
isHardwareSupported(): boolean
isInitialized(): boolean
iterationsPerStep: number
mass: number
massVertexWeight: number
maxAcceleration: number
mergeCloseVerticesEnabled: boolean
mergeCloseVerticesThreshold: number
mesh: RenderMesh
onInitialized: (clothVisual: ClothVisual) => void
removeColliderByIndex(index: number): ColliderComponent
repulsionEnabled: boolean
repulsionFriction: number
repulsionOffset: number
repulsionStiffness: number
resetSimulation(): void
setVertexBinding(index: number, bindingObj: SceneObject): void
setVertexSettings(index: number, vertexSettings: VertexSimulationSettings): void
simulatedMesh: RenderMesh
stretchStiffness: number
stretchStiffnessVertexWeight: number
updateNormalsEnabled: boolean
ClothVisual
BendMode
Isometric: number
Linear: number
CloudStorageListOptions
create(): CloudStorageListOptions
cursor: string
scope: StorageScope
CloudStorageModule
getCloudStore(options: CloudStorageOptions, onCloudStoreReady: (store: CloudStore) => void, onError: (code: string, description: string) => void): void
CloudStorageOptions
create(): CloudStorageOptions
session: MultiplayerSession
CloudStorageReadOptions
create(): CloudStorageReadOptions
scope: StorageScope
CloudStorageWriteOptions
create(): CloudStorageWriteOptions
scope: StorageScope
CloudStore
deleteValue(key: string, readOptions: CloudStorageReadOptions, onDeleted: () => void, onError: (code: string, description: string) => void): void
getValue(key: string, readOptions: CloudStorageReadOptions, onRetrieved: (key: string, value: string|number|boolean|vec4|vec3|quat|mat4|vec2|mat3|mat2) => void, onError: (code: string, description: string) => void): void
listValues(listOptions: CloudStorageListOptions, onRetrieved: (values: string|number|boolean|vec4|vec3|quat|mat4|vec2|mat3|mat2[][], cursor: string) => void, onError: (code: string, description: string) => void): void
setValue(key: string, value: string|number|boolean|vec4|vec3|quat|mat4|vec2|mat3|mat2, writeOptions: CloudStorageWriteOptions, onSaved: () => void, onError: (code: string, description: string) => void): void
ColliderComponent
angularVelocity: vec3
asset: LevelsetColliderAsset
clearMotion(): void
debugDrawEnabled: boolean
filter: Physics.Filter
fitVisual: boolean
forceCompound: boolean
intangible: boolean
matter: Matter
onCollisionEnter: event1
onCollisionExit: event1
onCollisionStay: event1
onOverlapEnter: event1
onOverlapExit: event1
onOverlapStay: event1
overlapFilter: Physics.Filter
rotateSmoothFactor: number
shape: Shape
smooth: boolean
translateSmoothFactor: number
velocity: vec3
worldSettings: Physics.WorldSettingsAsset
Collision
collider: ColliderComponent
contactCount: number
contacts: Contact[]
id: number
CollisionEnterEventArgs
collision: Collision
CollisionExitEventArgs
collision: Collision
CollisionMesh
CollisionStayEventArgs
collision: Collision
ColocatedLandmarks2DRenderObjectProvider
ColocatedLandmarks3DRenderObjectProvider
ColocatedLandmarksRenderObjectProviderBase
ColocatedTrackingComponent
buildingProgress: number
canBuild: boolean
canTrack: boolean
isBuilding: boolean
isJoining: boolean
isTracking: boolean
join(session: MultiplayerSession): void
onBuildFailed: event0
onFound: event0
onJoinFailed: event0
onLost: event0
onTrackingAvailable: event0
startBuilding(session: MultiplayerSession): void
Colorspace
R: number
RG: number
RGBA: number
Commerce
Client
acknowledgePurchase(purchaseToken: string): Promise
endConnection(): void
launchPurchaseFlow(productId: string): Promise
queryProductDetails(productIds: string[]): Promise
queryPurchase(productType: Commerce.ProductType): Promise
queryPurchaseHistory(): Promise
startConnection(): Promise
ClientOptions
extras: string
onPurchasesUpdated: (result: Commerce.PurchaseResult, purchases: Commerce.Purchase[]) => void
Price
currency: string
displayPrice: string
price: number
Product
description: string
displayName: string
extras: string
iconUri: string
id: string
price: Commerce.Price
type: Commerce.ProductType
ProductType
NonConsumable: number
Unknown: number
Purchase
productId: string
purchaseState: Commerce.PurchaseState
purchaseTime: number
token: string
PurchaseResult
debugMessage: string
responseCode: Commerce.ResponseCode
PurchaseState
Invalidated: number
Pending: number
Purchased: number
Unset: number
ResponseCode
Error: number
ItemAlreadyOwned: number
ItemNotOwned: number
ItemUnavailable: number
NetworkError: number
PaymentUnavailable: number
ServiceDisconnected: number
ServiceUnavailable: number
Success: number
UserCanceled: number
CommerceKitModule
createClient(options: Commerce.ClientOptions): Commerce.Client
CompassTrackingData
Accuracy
High: number
Low: number
Medium: number
NoContact: number
Unreliable: number
Component
destroy(): void
enabled: boolean
getSceneObject(): SceneObject
getTransform(): Transform
isEnabledInHierarchy: boolean
sceneObject: SceneObject
CompressionQuality
HighQuality: number
IntermediateQuality: number
LowQuality: number
MaximumCompression: number
MaximumQuality: number
ConeShape
axis: Axis
length: number
radius: number
ConnectedLensEnteredEvent
ConnectedLensModule
createSession(sessionOptions: ConnectedLensSessionOptions): void
shareSession(sessionShareType: ConnectedLensModule.SessionShareType, onSessionShared: (session: MultiplayerSession, snapcode: Texture) => void): void
ConnectedLensModule
ConnectionInfo
externalUsersInfo: ConnectedLensModule.UserInfo[]
hostUserInfo: ConnectedLensModule.UserInfo
localUserInfo: ConnectedLensModule.UserInfo
realtimeStores: GeneralDataStore[]
realtimeStoresCreationInfos: ConnectedLensModule.RealtimeStoreCreationInfo[]
HostUpdateInfo
sentServerTimeMilliseconds: number
userInfo: ConnectedLensModule.UserInfo
RealtimeStoreCreationInfo
allowOwnershipTakeOver: boolean
lastUpdatedServerTimestamp: number
ownerInfo: ConnectedLensModule.UserInfo
persistence: RealtimeStoreCreateOptions.Persistence
sentServerTimeMilliseconds: number
storeId: string
RealtimeStoreDeleteInfo
deleterInfo: ConnectedLensModule.UserInfo
sentServerTimeMilliseconds: number
RealtimeStoreKeyRemovalInfo
key: string
removerInfo: ConnectedLensModule.UserInfo
sentServerTimeMilliseconds: number
store: GeneralDataStore
RealtimeStoreOwnershipUpdateInfo
sentServerTimeMilliseconds: number
RealtimeStoreUpdateInfo
sentServerTimeMilliseconds: number
updaterInfo: ConnectedLensModule.UserInfo
SessionShareType
Invitation: number
Snapcode: number
UserInfo
connectionId: string
displayName: string
joinServerTimeMilliseconds: number
userId: string
ConnectedLensSessionOptions
create(): ConnectedLensSessionOptions
maxNumberOfInvitations: number
onSessionCreated: (session: MultiplayerSession, sessionCreationType: ConnectedLensSessionOptions.SessionCreationType) => void
ConnectedLensSessionOptions
SessionCreationType
MultiplayerReceiver: number
New: number
NewSoloMode: number
Constraint
constraintType: Physics.ConstraintType
ConstraintComponent
constraint: Constraint
debugDrawEnabled: boolean
reanchorTarget(): void
target: ColliderComponent
Contact
distance: number
impulse: number
normal: vec3
position: vec3
CropTextureProvider
inputTexture: Texture
CullMode
Back: number
Front: number
FrontAndBack: number
CustomLocationGroupComponent
hintUserPosition(groupLocalPosition: vec3): void
onFound: event1
CylinderShape
axis: Axis
length: number
radius: number
DebugRender
clear(): void
drawBox(position: vec3, width: number, height: number, depth: number, color: vec4): void
drawBrokenLine(points: vec3[], color: vec4): void
drawCircle(position: vec3, radius: number, color: vec4): void
drawLine(posA: vec3, posB: vec3, color: vec4): void
drawSolidBox(position: vec3, width: number, height: number, depth: number, color: vec4): void
drawSolidSphere(position: vec3, radius: number, color: vec4): void
drawSolidTriangle(vertex1: vec3, vertex2: vec3, vertex3: vec3, color: vec4): void
drawSphere(position: vec3, radius: number, color: vec4): void
isAutoClear: boolean
DeepLinkModule
onUriReceived: event1
openUri(uri: string): Promise
DeepLinkUriReceivedArgs
uri: string
DeformingCollisionMesh
Delay
maxTensorSize: number
process(inTensor: Float32Array, inShape: vec3, outTensor: Float32Array): vec3
DelayBuilder
build(): Delay
setDelay(delay: number): DelayBuilder
setNumFeatures(numFeatures: number): DelayBuilder
DelayedCallbackEvent
cancel(): void
getDelayTime(): number
getTimeLeft(): number
reset(time: number): void
Delta
maxTensorSize: number
process(inTensor: Float32Array, inShape: vec3, outTensor: Float32Array): vec3
DeltaBuilder
build(): Delta
setNumFeatures(numFeatures: number): DeltaBuilder
setWindowSize(winSize: number): DeltaBuilder
DepthClearOption
CustomTexture: number
CustomValue: number
None: number
DepthFrameData
depthFrame: Float32Array
deviceCamera: DeviceCamera
timestampSeconds: number
toWorldTrackingOriginFromDeviceRef: mat4
DepthFrameSession
onNewFrame: event1
start(): void
stop(): void
DepthModule
createDepthFrameSession(): DepthFrameSession
DepthSetter
DepthStencilRenderTargetProvider
clearDepthValue: number
clearStencilValue: number
depthClearOption: DepthClearOption
inputTexture: Texture
maskTexture: Texture
mipmapsEnabled: boolean
outputResolution: number
resolution: vec2
stencilClearOption: StencilClearOption
DepthTextureProvider
sampleDepthAtPoint(point: vec2): number
DeviceCamera
focalLength: vec2
pose: mat4
principalPoint: vec2
project(pointInDeviceReferenceNode: vec3): vec2
resolution: vec2
unproject(normalizedScreenSpacePoint: vec2, absoluteDepth: number): vec3
DeviceInfoSystem
getOS(): OS
getTrackingCamera(): DeviceCamera
getTrackingCameraForId(cameraId: CameraModule.CameraId): DeviceCamera
isCameraKit(): boolean
isDesktop(): boolean
isEditor(): boolean
isInternetAvailable(): boolean
isMobile(): boolean
isSpectacles(): boolean
onInternetStatusChanged: event1
performanceIndexes: PerformanceIndexes
screenScale: number
supportsDualCamera(callback: (supportsDualCamera: boolean) => void): void
DeviceLocationTrackingComponent
distanceToLocation: number
isTracking(): boolean
location: LocationAsset
locationProximityStatus: LocationProximityStatus
onLocationDataDownloadFailed: () => void
onLocationDataDownloaded: () => void
onLocationFound: () => void
onLocationLost: () => void
DeviceTracking
calculateWorldMeshHistogram(center: vec3, radius: number): TrackedMeshHistogramResult
createTrackedWorldPoint(worldPos: vec3, worldRot: quat): TrackedPoint
getActualDeviceTrackingMode(): DeviceTrackingMode
getDevicePath(): BasicTransform[]
getDevicePathIndex(): number
getPointCloud(): PointCloud
getRequestedDeviceTrackingMode(): DeviceTrackingMode
hitTestWorldMesh(screenPos: vec2): TrackedMeshHitTestResult[]
isDeviceTrackingModeSupported(mode: DeviceTrackingMode): boolean
raycastWorldMesh(from: vec3, to: vec3): TrackedMeshHitTestResult[]
requestDeviceTrackingMode(val: DeviceTrackingMode): void
resetTracking(position: vec2): void
rotationOptions: RotationOptions
setWorldOriginOffset(offset: vec3): void
surfaceOptions: SurfaceOptions
surfaceTrackingTarget: SceneObject
worldOptions: WorldOptions
worldTrackingCapabilities: WorldTrackingCapabilities
DeviceTrackingMode
Rotation: number
Surface: number
World: number
DeviceTrackingModule
Dialog
Answer
answer: string
questionId: number
status: number
DialogModule
askQuestions(context: string, questions: string[], onQuestionsAnswerComplete: (answers: Dialog.Answer[]) => void, onQuestionsAnswerError: (error: number, description: string) => void): void
DirectMultiplayerSessionOptions
DirectivityEffect
enabled: boolean
shapeDecay: number
shapeFactor: number
DistanceEffect
enabled: boolean
maxDistance: number
minDistance: number
type: Audio.DistanceCurveType
DomainInfo
description: string
name: string
states: StateInfo[]
DoubleTapEvent
getTapPosition(): vec2
DoubleTapEventArgs
position: vec2
DropshadowSettings
enabled: boolean
fill: TextFill
offset: vec2
DynamicResource
createWithBuffer(buffer: Uint8Array): DynamicResource
EncodingType
Jpg: number
Png: number
EventRegistration
Expressions
BrowsDownLeft: string
BrowsDownRight: string
BrowsUpCenter: string
BrowsUpLeft: string
BrowsUpRight: string
CheekSquintLeft: string
CheekSquintRight: string
EyeBlinkLeft: string
EyeBlinkRight: string
EyeDownLeft: string
EyeDownRight: string
EyeInLeft: string
EyeInRight: string
EyeOpenLeft: string
EyeOpenRight: string
EyeOutLeft: string
EyeOutRight: string
EyeSquintLeft: string
EyeSquintRight: string
EyeUpLeft: string
EyeUpRight: string
JawForward: string
JawLeft: string
JawOpen: string
JawRight: string
LipsFunnel: string
LipsPucker: string
LowerLipClose: string
LowerLipDownLeft: string
LowerLipDownRight: string
LowerLipRaise: string
MouthClose: string
MouthDimpleLeft: string
MouthDimpleRight: string
MouthFrownLeft: string
MouthFrownRight: string
MouthLeft: string
MouthRight: string
MouthSmileLeft: string
MouthSmileRight: string
MouthStretchLeft: string
MouthStretchRight: string
MouthUpLeft: string
MouthUpRight: string
Puff: string
SneerLeft: string
SneerRight: string
UpperLipClose: string
UpperLipRaise: string
UpperLipUpLeft: string
UpperLipUpRight: string
ExternalMusicInfo
isSameTrack(other: ExternalMusicInfo): boolean
ExternalMusicModule
getExternalMusicInfo(): ExternalMusicInfo
getLyricsTracker(): LyricsTracker
getSoundSyncTracker(): SoundSyncTracker
isTrackSet: boolean
onTrackChanged: event1
onTrackRemoved: event0
onTrackStarted: event1
onTrackStopped: event0
EyeColorVisual
faceIndex: number
trackingScope: TextureTrackingScope|PersonTrackingScope|FaceTrackingScope
FaceCropTextureProvider
clone(): FaceCropTextureProvider
faceCenterMouthWeight: number
faceIndex: number
textureScale: vec2
trackingScope: TextureTrackingScope|PersonTrackingScope|FaceTrackingScope
FaceFoundEvent
FaceImagePickerTextureProvider
cropToFace: boolean
faceControl: FaceTextureProvider
FaceInsetRegion
Face: number
LeftEye: number
Mouth: number
Nose: number
RightEye: number
FaceInsetVisual
faceIndex: number
faceRegion: FaceInsetRegion
flipX: boolean
flipY: boolean
innerBorderRadius: number
outerBorderRadius: number
sourceScale: vec2
subdivisionsCount: number
trackingScope: TextureTrackingScope|PersonTrackingScope|FaceTrackingScope
FaceLostEvent
FaceMaskVisual
customMaskOnMouthClosed: Texture
faceIndex: number
hidesMaskOnMouthClosed: boolean
originalFaceIndex: number
swapsMaskOnMouthClosed: boolean
teethAlpha: number
trackingScope: TextureTrackingScope|PersonTrackingScope|FaceTrackingScope
useOriginalTexCoords: boolean
FaceRenderObjectProvider
earGeometryEnabled: boolean
eyeCornerGeometryEnabled: boolean
eyeGeometryEnabled: boolean
faceGeometryEnabled: boolean
faceIndex: number
getExpressionNames(): string[]
getExpressionWeightByName(expressionName: string): number
getExpressionWeights(): Float32Array
mouthGeometryEnabled: boolean
onExpressionWeightsUpdate: event1
skullGeometryEnabled: boolean
trackingScope: TextureTrackingScope|PersonTrackingScope|FaceTrackingScope
FaceStretchVisual
addFeature(name: string): void
clearFeatures(): void
faceIndex: number
getFeatureNames(): string[]
getFeaturePoints(name: string): StretchPoint[]
getFeatureWeight(feature: string): number
removeFeature(name: string): void
setFeatureWeight(feature: string, intensity: number): void
trackingScope: TextureTrackingScope|PersonTrackingScope|FaceTrackingScope
updateFeaturePoints(name: string, points: StretchPoint[]): void
FaceTextureProvider
faceIndex: number
inputTexture: Texture
scale: vec2
FaceTrackingEvent
faceIndex: number
trackingScope: TextureTrackingScope|PersonTrackingScope|FaceTrackingScope
FaceTrackingScope
faceIndex: number
parentScope: TextureTrackingScope
FalloffType
None: number
Quadratic: number
FileAudioTrackProvider
duration: number
getAudioBuffer(audioBuffer: Float32Array, readSize: number): vec3
getAudioFrame(audioFrame: Float32Array): vec3
loops: number
position: number
FileLicensedSoundProvider
duration: number
getAudioBuffer(audioBuffer: Float32Array, readSize: number): vec3
getAudioFrame(audioFrame: Float32Array): vec3
loops: number
FileTextureProvider
Filter: Physics.Filter
FilteringMode
Bilinear: number
Nearest: number
Trilinear: number
FixedCollisionMesh
FixedConstraint
FloatAnimationPropertyTrack
FloatAnimationTrack
FloatAnimationTrackKeyFramed
addKey(time: number, value: number): void
removeAllKeys(): void
removeKeyAt(index: number): void
FloatBezierAnimationTrackKeyFramed
addKey(time: number, value: vec3): void
removeAllKeys(): void
removeKeyAt(index: number): void
FloatCurveAnimationPropertyTrack
FocusEndEventArgs
FocusStartEventArgs
Font
FrustumCullMode
Auto: number
Extend: number
UserDefinedAABB: number
GaussianSplattingAsset
createFromBuffers(positionsXYZ: Float32Array, scalesXYZ: Float32Array, rotationsWXYZ: Float32Array, colorsRGBA: Float32Array): GaussianSplattingAsset
getNumberOfFrames(): number
getSplatColors(): Float32Array
getSplatCount(): number
getSplatPositions(): Float32Array
getSplatRotations(): Float32Array
getSplatScales(): Float32Array
setSplatColors(rgbaArray: Float32Array): void
setSplatPositions(vec3Array: Float32Array): void
setSplatRotations(quatsWxyzArray: Float32Array): void
setSplatScales(vec3Array: Float32Array): void
GaussianSplattingVisual
activeFrame: number
asset: GaussianSplattingAsset
autoPlay: boolean
fps: number
isPlaying(): boolean
pause(): void
play(): void
GeneralDataStore
clear(): void
create(): GeneralDataStore
getAllKeys(): string[]
getBool(key: string): boolean
getBoolArray(key: string): boolean[]
getDouble(key: string): number
getFloat(key: string): number
getFloat32Array(key: string): Float32Array
getFloat64Array(key: string): Float64Array
getFloatArray(key: string): number[]
getInt(key: string): number
getInt16Array(key: string): Int16Array
getInt32Array(key: string): Int32Array
getInt8Array(key: string): Int8Array
getIntArray(key: string): number[]
getMat2(key: string): mat2
getMat2Array(key: string): mat2[]
getMat3(key: string): mat3
getMat3Array(key: string): mat3[]
getMat4(key: string): mat4
getMat4Array(key: string): mat4[]
getMaxSizeInBytes(): number
getQuat(key: string): quat
getQuatArray(key: string): quat[]
getSizeInBytes(): number
getString(key: string): string
getStringArray(key: string): string[]
getUint16Array(key: string): Uint16Array
getUint32Array(key: string): Uint32Array
getUint8Array(key: string): Uint8Array
getVec2(key: string): vec2
getVec2Array(key: string): vec2[]
getVec3(key: string): vec3
getVec3Array(key: string): vec3[]
getVec4(key: string): vec4
getVec4Array(key: string): vec4[]
has(key: string): boolean
onStoreFull: () => void
putBool(key: string, value: boolean): void
putBoolArray(key: string, value: boolean[]): void
putDouble(key: string, value: number): void
putFloat(key: string, value: number): void
putFloat32Array(key: string, value: Float32Array): void
putFloat64Array(key: string, value: Float64Array): void
putFloatArray(key: string, value: number[]): void
putInt(key: string, value: number): void
putInt16Array(key: string, value: Int16Array): void
putInt32Array(key: string, value: Int32Array): void
putInt8Array(key: string, value: Int8Array): void
putIntArray(key: string, value: number[]): void
putMat2(key: string, value: mat2): void
putMat2Array(key: string, value: mat2[]): void
putMat3(key: string, value: mat3): void
putMat3Array(key: string, value: mat3[]): void
putMat4(key: string, value: mat4): void
putMat4Array(key: string, value: mat4[]): void
putQuat(key: string, value: quat): void
putQuatArray(key: string, value: quat[]): void
putString(key: string, value: string): void
putStringArray(key: string, value: string[]): void
putUint16Array(key: string, value: Uint16Array): void
putUint32Array(key: string, value: Uint32Array): void
putUint8Array(key: string, value: Uint8Array): void
putVec2(key: string, value: vec2): void
putVec2Array(key: string, value: vec2[]): void
putVec3(key: string, value: vec3): void
putVec3Array(key: string, value: vec3[]): void
putVec4(key: string, value: vec4): void
putVec4Array(key: string, value: vec4[]): void
remove(key: string): void
GeoLocation
createLocationService(): LocationService
getGeoPositionForLocation(location: LocationAsset): Promise
getNorthAlignedHeading(northAlignedOrientation: quat): number
GeoLocationAccuracy
High: number
Low: number
Medium: number
Navigation: number
GeoPosition
altitude: number
create(): GeoPosition
heading: number
horizontalAccuracy: number
isHeadingAvailable: boolean
latitude: number
locationSource: string
longitude: number
timestamp: Date
verticalAccuracy: number
GestureModule
getFilteredPinchDownEvent(handType: GestureModule.HandType): event1
getFilteredPinchUpEvent(handType: GestureModule.HandType): event1
getGrabBeginEvent(handType: GestureModule.HandType): event1
getGrabEndEvent(handType: GestureModule.HandType): event1
getIsPhoneInHandBeginEvent(handType: GestureModule.HandType): event1
getIsPhoneInHandEndEvent(handType: GestureModule.HandType): event1
getPalmTapDownEvent(handType: GestureModule.HandType): event1
getPalmTapUpEvent(handType: GestureModule.HandType): event1
getPinchDownEvent(handType: GestureModule.HandType): event1
getPinchStrengthEvent(handType: GestureModule.HandType): event1
getPinchUpEvent(handType: GestureModule.HandType): event1
getTargetingDataEvent(handType: GestureModule.HandType): event1
GestureModule
HandType
Left: number
Right: number
GesturesDataArgs
GltfAsset
extras: string
getResourceFromExtras(url: string): DynamicResource
getStaticComposition(): string
tryInstantiate(parent: SceneObject, material: Material): SceneObject
tryInstantiateAsync(parent: SceneObject, material: Material, onSuccess: (sceneObject: SceneObject) => void, onFailure: (error: string) => void, onProgress: (progress: number) => void, gltfSettings: GltfSettings): void
tryInstantiateWithSetting(parent: SceneObject, material: Material, gltfSettings: GltfSettings): SceneObject
GltfSettings
convertMetersToCentimeters: boolean
create(): GltfSettings
optimizeGeometry: boolean
storeTriangleOrder: boolean
GrabBeginArgs
GrabEndArgs
Gyroscope
invertOnFrontCamera: boolean
invertRotation: boolean
HairDataAsset
HairVisual
addCollider(colliderComponent: ColliderComponent): void
clearColliders(): void
clumpDensity: number
clumpRadius: number
clumpTipScale: number
colliders: ColliderComponent[]
collisionEnabled: boolean
collisionFriction: number
collisionOffset: number
collisionStiffness: number
damp: number
density: number
fallbackHairMaterial: Material
fallbackModeEnabled: boolean
friction: number
gravity: vec3
hairMaterial: Material
hairResolution: number
isHardwareSupported(): boolean
isInitialized(): boolean
noise: number
onInitialized: (hairVisual: HairVisual) => void
primaryHairMaterial: Material
removeColliderByIndex(index: number): ColliderComponent
resetSimulation(): void
selfCollisionEnabled: boolean
selfCollisionFriction: number
selfCollisionRadius: number
selfCollisionStiffness: number
stiffness: number
strandTaper: number
strandWidth: number
windEnabled: boolean
windForce: vec3
HandSpecificData
HandTracking3DAsset
HapticFeedbackSystem
hapticFeedback(type: HapticFeedbackType): void
HapticFeedbackType
TapticEngine: number
Vibration: number
Head
faceIndex: number
getFacesCount(): number
getLandmark(index: number): vec2
getLandmarkCount(): number
getLandmarks(): vec2[]
onLandmarksUpdate: event1
setAttachmentPointType(attachmentPointType: AttachmentPointType): void
trackingScope: TextureTrackingScope|PersonTrackingScope|FaceTrackingScope
Headers
append(name: string, value: string): void
delete(name: string): void
entries(): string[][]
get(name: string): string
has(name: string): boolean
keys(): string[]
set(name: string, value: string): void
values(): string[]
HingeConstraint
limitSettings: HingeLimitSettings
motorSettings: HingeMotorSettings
HingeLimitSettings
bias: number
enabled: boolean
high: number
low: number
relaxation: number
HingeMotorSettings
enabled: boolean
maxImpulse: number
targetType: HingeMotorType
targetValue: number
HingeMotorType
AngleTarget: number
VelocityTarget: number
HintsComponent
hideHint(hintID: string): boolean
showHint(hintID: string, duration: number): boolean
HitTestSession
hitTest(rayStart: vec3, rayEnd: vec3, hitCallback: (hit: WorldQueryHitTestResult) => void): void
reset(): void
start(): void
stop(): void
HitTestSessionOptions
classification: boolean
create(): HitTestSessionOptions
filter: boolean
HorizontalAlignment
Center: number
Left: number
Right: number
HorizontalOverflow
Ellipsis: number
EllipsisFront: number
Overflow: number
Shrink: number
Truncate: number
TruncateFront: number
Wrap: number
HoverEndEvent
getHoverPosition(): vec2
HoverEndEventArgs
position: vec2
HoverEvent
getHoverPosition(): vec2
HoverEventArgs
position: vec2
HoverStartEvent
getHoverPosition(): vec2
HoverStartEventArgs
position: vec2
IEventParameters
Image
flipX: boolean
flipY: boolean
pivot: vec2
rotationAngle: number
ImageFrame
texture: Texture
ImagePickerTextureProvider
autoShowImagePicker: boolean
hideImagePicker(): void
setImageChangedCallback(callback: () => void): void
showImagePicker(): void
InputBuilder
build(): InputPlaceholder
setInputTexture(texture: Texture): InputBuilder
setName(name: string): InputBuilder
setSampler(sampler: Sampler): InputBuilder
setShape(shape: vec3): InputBuilder
setTransformer(transformer: Transformer): InputBuilder
InputPlaceholder
data: Float32Array
texture: Texture
IntAnimationPropertyTrack
IntAnimationTrack
IntStepAnimationPropertyTrack
IntStepAnimationTrackKeyFramed
addKey(time: number, value: number): void
removeAllKeys(): void
removeKeyAt(index: number): void
IntStepNoLerpAnimationTrackKeyFramed
addKey(time: number, value: number): void
removeAllKeys(): void
removeKeyAt(index: number): void
InteractionComponent
addMeshVisual(meshVisual: BaseMeshVisual): void
addTouchBlockingException(exception: string): void
getMinimumTouchSize(): number
isFilteredByDepth: boolean
isFocused: boolean
isSelected: boolean
onDoubleTap: event1
onFocusEnd: event1
onFocusStart: event1
onHover: event1
onHoverEnd: event1
onHoverStart: event1
onLongPressEnd: event1
onLongPressStart: event1
onPanEnd: event1
onPanMove: event1
onPanStart: event1
onPinchEnd: event1
onPinchMove: event1
onPinchStart: event1
onScroll: event1
onScrollEnd: event1
onScrollStart: event1
onSelectEnd: event1
onSelectStart: event1
onTap: event1
onTouchEnd: event1
onTouchMove: event1
onTouchStart: event1
onTriggerPrimary: event1
removeMeshVisual(meshVisual: BaseMeshVisual): void
setCamera(camera: Camera): void
setMinimumTouchSize(value: number): void
InternetModule
createWebSocket(url: string, protocols: any): WebSocket
createWebView(options: WebViewOptions, onSuccess: (texture: Texture) => void, onFailure: (errorMessage: string) => void): void
createWebViewOptions(resolution: vec2): WebViewOptions
fetch(request: string|Request, options: any): Promise
makeResourceFromBlob(blob: Blob): DynamicResource
makeResourceFromUrl(mediaUrl: string): DynamicResource
performHttpRequest(requestOptions: RemoteServiceHttpRequest, onHttpResponse: (response: RemoteServiceHttpResponse) => void): void
InternetStatusChangedArgs
isInternetAvailable: boolean
IsPhoneInHandBeginArgs
IsPhoneInHandEndArgs
JsonAsset
getString(): string
KeyModifiers
Alt: number
Control: number
Meta: number
Shift: number
KeyPressEvent
key: Keys
modifiers: KeyModifiers[]
KeyReleaseEvent
key: Keys
modifiers: KeyModifiers[]
KeyboardManager
isKeyPressed(key: Keys): boolean
Keys
A: number
Alt: number
B: number
Backspace: number
C: number
Control: number
D: number
Down: number
E: number
Eight: number
F: number
Five: number
Four: number
G: number
H: number
I: number
Invalid: number
J: number
K: number
L: number
Left: number
M: number
Meta: number
N: number
Nine: number
O: number
One: number
P: number
Q: number
R: number
Right: number
S: number
Seven: number
Shift: number
Six: number
Space: number
T: number
Three: number
Two: number
U: number
Up: number
V: number
W: number
X: number
Y: number
Z: number
Zero: number
KissFinishedEvent
KissStartedEvent
Label
fontAsset: Font
measureText(text: string): vec2
outlineColor: vec4
outlineSize: number
shadowColor: vec4
shadowOffset: vec2
size: number
text: string
textColor: vec4
useDropshadow: boolean
useOutline: boolean
LateUpdateEvent
getDeltaTime(): number
LayerSet
contains(other: LayerSet): boolean
except(other: LayerSet): LayerSet
fromNumber(layerId: number): LayerSet
intersect(other: LayerSet): LayerSet
isEmpty(): boolean
makeUnique(): LayerSet
numbers: number[]
toString(): string
union(other: LayerSet): LayerSet
Leaderboard
getLeaderboardInfo(options: Leaderboard.RetrievalOptions, successCallback: (othersInfo: Leaderboard.UserRecord[], currentUserInfo: Leaderboard.UserRecord) => void, failureCallback: (status: number) => void): void
name: string
orderingType: Leaderboard.OrderingType
submitScore(score: number, successCallback: (currentUserInfo: Leaderboard.UserRecord) => void, failureCallback: (status: number) => void): void
ttlSeconds: number
Leaderboard
CreateOptions
name: string
orderingType: Leaderboard.OrderingType
ttlSeconds: number
create(): Leaderboard.CreateOptions
OrderingType
Ascending: number
Descending: number
RetrievalOptions
usersLimit: number
usersType: Leaderboard.UsersType
create(): Leaderboard.RetrievalOptions
UserRecord
globalExactRank: number
globalRankPercentile: number
score: number
snapchatUser: SnapchatUser
UsersType
Friends: number
Global: number
LeaderboardModule
getLeaderboard(options: Leaderboard.CreateOptions, successCallback: (leaderboard: Leaderboard) => void, failureCallback: (message: string) => void): void
LevelsetColliderAsset
LevelsetShape
asset: LevelsetColliderAsset
LicensedAudioTrackAsset
getExternalMusicInfo(): ExternalMusicInfo
LightSource
autoLightSourcePosition: boolean
autoShadowFrustumSize: boolean
castsShadows: boolean
color: vec3
diffuseEnvmapTexture: Texture
envmapExposure: number
envmapRotation: number
falloffRange: number
falloffType: FalloffType
gaussianBlurSigma: number
intensity: number
lightType: LightType
renderLayer: LayerSet
shadowBlurRadius: number
shadowColor: vec4
shadowDensity: number
shadowFrustumFarClipPlane: number
shadowFrustumNearClipPlane: number
shadowFrustumSize: number
specularEnvmapTexture: Texture
useEnvmap: boolean
LightType
Ambient: number
Directional: number
Envmap: number
Estimation: number
Point: number
Spot: number
LiquifyVisual
intensity: number
radius: number
LoadStatus
Idle: number
Loaded: number
Loading: number
LocalizationSystem
getDateAndTimeFormatted(date: Date): string
getDateFormatted(date: Date): string
getDateShortFormatted(date: Date): string
getDayOfWeek(date: Date): string
getFormattedDistanceFromMeters(meters: number): string
getFormattedNumber(number: number): string
getFormattedSeconds(seconds: number): string
getFormattedTemperatureFromCelsius(temperature: number): string
getFormattedTemperatureFromFahrenheit(temperature: number): string
getLanguage(): string
getMonth(date: Date): string
getTimeFormatted(date: Date): string
language: string
localize(key: string): string
LocalizationsAsset
LocatedAtComponent
createMappingOptions(): MappingOptions
createMappingSession(options: MappingOptions): MappingSession
distanceToLocation: number
location: LocationAsset
onCanTrack: event0
onCannotTrack: event0
onError: event0
onFound: event0
onLost: event0
onReady: event0
position: vec3
proximityStatus: LocationProximityStatus
LocationAsset
adjacentTile(xOffset: number, yOffset: number, zoomOffset: number): LocationAsset
fromSerialized(serialized: string): LocationAsset
getAROrigin(): LocationAsset
getGeoAnchoredPosition(longitude: number, latitude: number): Anchor
getNearby(xOffset: number, yOffset: number, zoomOffset: number): LocationAsset
getProxy(proxyId: string): LocationAsset
getProxyId(): string
toSerialized(): string
LocationCloudStorageModule
getNearbyLocationStores(options: LocationCloudStorageOptions): void
retrieveLocation(persistedLocationId: string, onRetrievedLocation: (location: LocationAsset) => void, onError: (error: string) => void): void
session: MultiplayerSession
storeLocation(location: LocationAsset, onStoredLocation: (persistedLocationId: string) => void, onError: (error: string) => void): void
LocationCloudStorageOptions
collection: string
create(): LocationCloudStorageOptions
location: LocationAsset
onDiscoveredNearby: event2
onError: event3
LocationCloudStore
deleteValue(key: string, readOptions: CloudStorageReadOptions, onDeleted: () => void, onError: (code: string, description: string) => void): void
getValue(key: string, readOptions: CloudStorageReadOptions, onRetrieved: (key: string, value: string|number|boolean|vec4|vec3|quat|mat4|vec2|mat3|mat2, collection: string) => void, onError: (code: string, description: string) => void): void
listValues(listOptions: CloudStorageListOptions, onRetrieved: (values: string|number|boolean|vec4|vec3|quat|mat4|vec2|mat3|mat2[][], cursor: string, collection: string) => void, onError: (code: string, description: string) => void): void
setValue(key: string, value: string|number|boolean|vec4|vec3|quat|mat4|vec2|mat3|mat2, writeOptions: CloudStorageWriteOptions, onSaved: () => void, onError: (code: string, description: string) => void): void
LocationProximityStatus
OutOfRange: number
Unknown: number
WithinRange: number
LocationRenderObjectProvider
create(): RenderMesh
location: LocationAsset
onLocationDataDownloadFailed: event0
onLocationDataDownloaded: event0
LocationService
accuracy: GeoLocationAccuracy
getCurrentPosition(onSucess: (geoPosition: GeoPosition) => void, onError: (error: string) => void): void
onNorthAlignedOrientationUpdate: event2
LocationTextureProvider
create(): Texture
location: LocationAsset
LongPressEndEventArgs
position: vec2
LongPressStartEventArgs
position: vec2
LookAtComponent
aimVectors: LookAtComponent.AimVectors
lookAtMode: LookAtComponent.LookAtMode
offsetRotation: quat
target: SceneObject
worldUpVector: LookAtComponent.WorldUpVector
LookAtComponent
AimVectors
NegativeXAimNegativeYUp: number
NegativeXAimNegativeZUp: number
NegativeXAimYUp: number
NegativeXAimZUp: number
NegativeYAimNegativeXUp: number
NegativeYAimNegativeZUp: number
NegativeYAimXUp: number
NegativeYAimZUp: number
NegativeZAimNegativeXUp: number
NegativeZAimNegativeYUp: number
NegativeZAimXUp: number
NegativeZAimYUp: number
XAimNegativeYUp: number
XAimNegativeZUp: number
XAimYUp: number
XAimZUp: number
YAimNegativeXUp: number
YAimNegativeZUp: number
YAimXUp: number
YAimZUp: number
ZAimNegativeXUp: number
ZAimNegativeYUp: number
ZAimXUp: number
ZAimYUp: number
LookAtMode
LookAtDirection: number
LookAtPoint: number
WorldUpVector
ObjectX: number
ObjectY: number
ObjectZ: number
SceneX: number
SceneY: number
SceneZ: number
TargetX: number
TargetY: number
TargetZ: number
Lyrics
clipDuration: number
lines: LyricsLine[]
type: LyricsType
LyricsLine
fullLineText: string
offset: number
offsetEnd: number
syncs: LyricsSync[]
LyricsSync
duration: number
offset: number
offsetEnd: number
text: string
LyricsTracker
currentLine: LyricsLine
fullLyrics: Lyrics
isPlaying: boolean
nextLine: LyricsLine
onLineEnd: event1
onLineStart: event1
onLyricsAvailable: event0
onLyricsCleared: event0
onPlaybackReset: event0
onPlaybackStarted: event1
onWordEnd: event1
onWordStart: event1
playbackPosition: number
LyricsType
LineSync: number
RichSync: number
Unset: number
MFCC
maxTensorSize: number
process(inTensor: Float32Array, inShape: vec3, outTensor: Float32Array): vec3
MFCCBuilder
build(): MFCC
setFFTSize(fftSize: number): MFCCBuilder
setFrameSize(frameSize: number): MFCCBuilder
setHopSize(hopSize: number): MFCCBuilder
setLifter(lifter: number): MFCCBuilder
setMaxFreq(maxFreq: number): MFCCBuilder
setMinFreq(minFreq: number): MFCCBuilder
setNumMFCC(numMFCC: number): MFCCBuilder
setNumMel(numMel: number): MFCCBuilder
setSampleRate(sampleRate: number): MFCCBuilder
MLAsset
getMetadata(): any
MLComponent
autoRun: boolean
build(placeholders: BasePlaceholder[]): void
buildAsync(placeholders: BasePlaceholder[]): Promise
cancel(): void
getInput(name: string): InputPlaceholder
getInputs(): InputPlaceholder[]
getOutput(name: string): OutputPlaceholder
getOutputs(): OutputPlaceholder[]
getScheduledEnd(): MachineLearning.FrameTiming
getScheduledStart(): MachineLearning.FrameTiming
inferenceMode: MachineLearning.InferenceMode
isRecurring(): boolean
model: MLAsset
onLoadingFailed: (error: string) => void
onLoadingFinished: () => void
onRunningFailed: (error: string) => void
onRunningFinished: () => void
renderOrder: number
runImmediate(sync: boolean): void
runScheduled(recurring: boolean, startTiming: MachineLearning.FrameTiming, endTiming: MachineLearning.FrameTiming): void
state: MachineLearning.ModelState
stop(): void
waitOnLoading(): void
waitOnRunning(): void
MachineLearning
createDelayBuilder(): DelayBuilder
createDeltaBuilder(): DeltaBuilder
createInputBuilder(): InputBuilder
createMFCCBuilder(): MFCCBuilder
createMelSpectrogramBuilder(): MelSpectrogramBuilder
createNoiseReductionBuilder(): NoiseReductionBuilder
createOutputBuilder(): OutputBuilder
createPitchShifterBuilder(): PitchShifterBuilder
createSamplerBuilder(): SamplerBuilder
createSpectrogramBuilder(): SpectrogramBuilder
createTransformerBuilder(): TransformerBuilder
MachineLearning
DataLayout
NCHW: number
NHWC: number
FrameTiming
LateUpdate: number
None: number
OnRender: number
Update: number
InferenceMode
Accelerator: number
Auto: number
CPU: number
GPU: number
NativeCPU: number
NativeCPUAndNPU: number
ModelState
Idle: number
Loading: number
LoadingError: number
NotReady: number
Running: number
OutputMode
Data: number
Texture: number
ManipulateComponent
clampWorldPosition(): void
enableManipulateType(type: ManipulateType, enable: boolean): void
intersectManipulateFrame(screenSpacePoint: vec2): ManipulateFrameIntersectResult
isContextualSwivel: boolean
isManipulateTypeEnabled(type: ManipulateType): boolean
isManipulating: boolean
maxDistance: number
maxHeight: number
maxScale: number
minDistance: number
minHeight: number
minScale: number
onManipulateEnd: event1
onManipulateStart: event1
rotationScale: number
ManipulateEndEvent
ManipulateEndEventArgs
ManipulateFrameIntersectResult
getIntersectionPoint(): vec3
isValid(): boolean
ManipulateStartEvent
ManipulateStartEventArgs
ManipulateType
Drag: number
Scale: number
Swivel: number
MapModule
createMapTextureProvider(): Texture
longLatToImageRatio(longitude: number, latitude: number, location: LocationAsset): vec2
MapTextureProvider
location: LocationAsset
onFailed: event0
onReady: event0
MappingOptions
geoPositionEnabled: boolean
location: LocationAsset
locationCloudStorageModule: LocationCloudStorageModule
policy: string
scope: MappingSession.MappingScope
MappingSession
canCheckpoint: boolean
cancel(): void
capacityUsed: number
checkpoint(): Promise
handheldMaximumSize: number
handheldMinimumSize: number
onCapacityUsedAtLimit: event0
onMapped: event1
onQualityAcceptable: event0
quality: number
throttling: MappingSession.MappingThrottling
wearableAcceptableRawCapacity: number
wearableAllowEarlyCheckpoint: boolean
wearableMaximumSize: number
wearableMinimumSize: number
MappingSession
MappingScope
All: number
New: number
MappingThrottling
Auto: number
Background: number
Foreground: number
Off: number
MarkerAsset
getAspectRatio(): number
height: number
MarkerProvider
MarkerTrackingComponent
autoEnableWhenTracking: boolean
isTracking(): boolean
marker: MarkerAsset
onMarkerFound: () => void
onMarkerLost: () => void
MaskingComponent
cornerRadius: number
Material
clone(): Material
getPass(index: number): Pass
getPassCount(): number
mainPass: Pass
MaterialMeshVisual
addMaterial(material: Material): void
clearMaterials(): void
getMaterial(index: number): Material
getMaterialsCount(): number
mainMaterial: Material
mainPass: Pass
mainPassOverrides: any
materials: Material[]
propertyOverrides: PropertyOverrides
MaterialPropertyOverrides
MathUtils
DegToRad: number
RadToDeg: number
clamp(v: number, lo: number, hi: number): number
lerp(a: number, b: number, time: number): number
randomRange(lo: number, hi: number): number
remap(v: number, inMin: number, inMax: number, outMin: number, outMax: number): number
Matter
dynamicBounciness: number
friction: number
rollingFriction: number
spinningFriction: number
staticBounciness: number
MediaPickerTextureProvider
autoShowMediaPicker: boolean
cropFace: boolean
faceImageControl: FaceTextureProvider
faceRect: vec4
hideMediaPicker(): void
imageControl: TextureProvider
isContentReady: boolean
isFaceImagePickingEnabled: boolean
isImagePickingEnabled: boolean
isVideoPickingEnabled: boolean
setFaceMeshReadyCallback(callback: () => void): void
setFilePickedCallback(callback: () => void): void
showMediaPicker(): void
videoControl: VideoTextureProvider
MelSpectrogram
process(inTensor: Float32Array, inShape: vec3, outTensor: Float32Array): vec3
MelSpectrogramBuilder
build(): MelSpectrogram
setFFTSize(fftSize: number): MelSpectrogramBuilder
setFrameSize(frameSize: number): MelSpectrogramBuilder
setHopSize(hopSize: number): MelSpectrogramBuilder
setMaxFreq(maxFreq: number): MelSpectrogramBuilder
setMinFreq(minFreq: number): MelSpectrogramBuilder
setNumMel(numMel: number): MelSpectrogramBuilder
setSampleRate(sampleRate: number): MelSpectrogramBuilder
MeshBuilder
appendIndices(indices: number[]): void
appendVertices(verts: number[][]): void
appendVerticesInterleaved(verts: number[]): void
createFromMesh(mesh: RenderMesh): MeshBuilder
eraseIndices(from: number, to: number): void
eraseVertices(from: number, to: number): void
getIndicesCount(): number
getMesh(): RenderMesh
getVerticesCount(): number
indexType: MeshIndexType
isValid(): boolean
setBones(bones: string[], inverseMatrices: mat4[]): void
setVertexInterleaved(index: number, verts: number[]): void
topology: MeshTopology
updateMesh(): void
MeshClassificationFormat
None: number
PerVertexFast: number
MeshIndexType
None: number
UInt16: number
MeshRenderObjectProvider
MeshShadowMode
Caster: number
None: number
Receiver: number
MeshShape
convex: boolean
mesh: RenderMesh
skin: Skin
MeshTopology
LineStrip: number
Lines: number
Points: number
TriangleFan: number
TriangleStrip: number
Triangles: number
MeshVisual
MicrophoneAudioProvider
getAudioFrame(audioFrame: Float32Array): vec3
getAudioFramePCM16(audioFrame: Int16Array): vec3
start(): void
stop(): void
MotionController
getMotionState(): MotionController.MotionType
getTouchpadPhysicalSize(): vec2
getTouchpadPointSize(): vec2
getTrackingQuality(): MotionController.TrackingQuality
getWorldPosition(): vec3
getWorldRotation(): quat
invokeHaptic(hapticRequest: MotionController.HapticRequest): void
isControllerAvailable(): boolean
onControllerStateChange: event1
onMotionTypeChange: event1
onTouchEvent: event4
onTouchpadSizeChange: event2
onTrackingQualityChange: event1
onTransformEvent: event2
options: MotionController.MotionControllerOptions
MotionController
HapticFeedback
Default: number
Error: number
Select: number
Success: number
Tick: number
VibrationHigh: number
VibrationLow: number
VibrationMedium: number
HapticRequest
duration: number
hapticFeedback: MotionController.HapticFeedback
create(): MotionController.HapticRequest
MotionControllerOptions
controllerId: string
motionType: MotionController.MotionType
create(): MotionController.MotionControllerOptions
MotionType
NoMotion: number
SixDoF: number
ThreeDoF: number
Options
create(): MotionController.MotionControllerOptions
TouchPhase
Began: number
Canceled: number
Ended: number
Moved: number
TrackingQuality
Limited: number
Normal: number
Unknown: number
MotionControllerModule
getController(options: MotionController.MotionControllerOptions): MotionController
MouthClosedEvent
MouthOpenedEvent
MultiplayerSession
activeUserCount: number
activeUsersInfo: ConnectedLensModule.UserInfo[]
allRealtimeStores: GeneralDataStore[]
clearRealtimeStoreOwnership(store: GeneralDataStore, onSuccess: (store: GeneralDataStore) => void, onError: (message: string) => void): void
createRealtimeStore(options: RealtimeStoreCreateOptions, onSuccess: (store: GeneralDataStore) => void, onError: (message: string) => void): void
deleteRealtimeStore(store: GeneralDataStore, onSuccess: (store: GeneralDataStore) => void, onError: (message: string) => void): void
deleteStoredValue(key: string, scope: StorageScope, onDeleted: () => void, onError: (code: string, description: string) => void): void
getLocalUserId(localUserIdCallback: (userId: string) => void): void
getLocalUserInfo(localUserInfoCallback: (userInfo: ConnectedLensModule.UserInfo) => void): void
getRealtimeStoreInfo(store: GeneralDataStore): ConnectedLensModule.RealtimeStoreCreationInfo
getSafeSnapchatUser(userInfo: ConnectedLensModule.UserInfo, safeSnapchatUserCallback: (safeSnapchatUser: SafeSnapchatUser) => void): void
getServerTimestamp(): number
getSnapchatUser(userInfo: ConnectedLensModule.UserInfo, snapchatUserCallback: (snapchatUser: SnapchatUser) => void): void
getStoredValue(key: string, scope: StorageScope, onRetrieved: (key: string, value: string|number|boolean|vec4|vec3|quat|mat4|vec2|mat3|mat2) => void, onError: (code: string, description: string) => void): void
listStoredValues(scope: StorageScope, cursor: string, onRetrieved: (values: string|number|boolean|vec4|vec3|quat|mat4|vec2|mat3|mat2[][], cursor: string) => void, onError: (code: string, description: string) => void): void
requestRealtimeStoreOwnership(store: GeneralDataStore, onSuccess: (store: GeneralDataStore) => void, onError: (message: string) => void): void
sendMessage(message: string): void
sendMessageWithTimeout(message: string, timeoutMs: number): void
setStoredValue(key: string, value: string|number|boolean|vec4|vec3|quat|mat4|vec2|mat3|mat2, options: StorageOptions, onSaved: () => void, onError: (code: string, description: string) => void): void
NamedValues
names: string[]
values: Float32Array
NativePlaneTrackingType
Both: number
Horizontal: number
None: number
Vertical: number
NoiseReduction
amount: number
maxTensorSize: number
process(inTensor: Float32Array, inShape: vec3, outTensor: Float32Array): vec3
NoiseReductionBuilder
build(): NoiseReduction
setSampleRate(sampleRate: number): NoiseReductionBuilder
OS
Android: number
MacOS: number
Windows: number
iOS: number
Object3DAsset
ObjectPrefab
createFromSceneObject(sceneObject: SceneObject): ObjectPrefab
instantiate(parent: SceneObject): SceneObject
instantiateAsync(parent: SceneObject, onSuccess: (sceneObject: SceneObject) => void, onFailure: (error: string) => void, onProgress: (progress: number) => void): void
ObjectSpecificData
ObjectTracking
autoEnableWhenTracking: boolean
isTracking(): boolean
objectIndex: number
objectSpecificData: ObjectSpecificData
onObjectFound: () => void
onObjectLost: () => void
registerDescriptorEnd(descriptor: string, callback: (descriptor: string) => void): void
registerDescriptorStart(descriptor: string, callback: (descriptor: string) => void): void
ObjectTracking3D
addAttachmentPoint(name: string, object: SceneObject): void
attachmentModeInheritRotation: boolean
attachmentModeInheritScale: boolean
createAttachmentPoint(name: string): SceneObject
getAttachedObjects(name: string): SceneObject[]
isAttachmentPointTracking(name: string): boolean
isTracking(): boolean
objectIndex: number
objectSpecificData: ObjectSpecificData
onTrackingLost: () => void
onTrackingStarted: () => void
removeAttachmentPoint(object: SceneObject): void
trackPosition: boolean
trackingAsset: Object3DAsset
trackingMode: ObjectTracking3D.TrackingMode
ObjectTracking3D
TrackingMode
Attachment: number
PoseOnly: number
ProportionsAndPose: number
ObjectTrackingMaskedTextureProvider
objectIndex: number
ObjectTrackingNormalsTextureProvider
ObjectTrackingTextureProvider
OnAwakeEvent
OnDestroyEvent
OnDisableEvent
OnEnableEvent
OnPauseEvent
OnResumeEvent
OnStartEvent
OutlineSettings
enabled: boolean
fill: TextFill
size: number
OutputBuilder
build(): OutputPlaceholder
setName(name: string): OutputBuilder
setOutputMode(outputMode: MachineLearning.OutputMode): OutputBuilder
setShape(shape: vec3): OutputBuilder
setTransformer(transformer: Transformer): OutputBuilder
OutputPlaceholder
data: Float32Array
mode: MachineLearning.OutputMode
texture: Texture
Overlap
collider: ColliderComponent
id: number
OverlapEnterEventArgs
currentOverlapCount: number
currentOverlaps: Overlap[]
overlap: Overlap
OverlapExitEventArgs
currentOverlapCount: number
currentOverlaps: Overlap[]
overlap: Overlap
OverlapStayEventArgs
currentOverlapCount: number
currentOverlaps: Overlap[]
overlap: Overlap
PalmTapDownArgs
confidence: number
PalmTapUpArgs
confidence: number
PanEndEventArgs
touches: vec2[]
translation: vec2
PanMoveEventArgs
touches: vec2[]
translation: vec2
PanStartEventArgs
touches: vec2[]
translation: vec2
Pass
baseColor: vec4
baseTex: Texture
blendMode: BlendMode
colorMask: vec4b
cullMode: CullMode
depthTest: boolean
depthWrite: boolean
frustumCullMax: vec3
frustumCullMin: vec3
frustumCullMode: FrustumCullMode
frustumCullPad: number
instanceCount: number
lineWidth: number
name: string
polygonOffset: vec2
samplers: SamplerWrappers
stencilState: StencilState
twoSided: boolean
writesColor: boolean
PassPropertyOverrides
baseColor: vec4
baseTex: Texture
PassWrapper
blendMode: BlendMode
colorMask: vec4b
cullMode: CullMode
depthTest: boolean
depthWrite: boolean
instanceCount: number
lineWidth: number
name: string
polygonOffset: vec2
samplers: SamplerWrappers
twoSided: boolean
PassWrappers
allPasses: PassWrapper[]
PerformanceIndexes
general: number
PersistentStorageSystem
store: GeneralDataStore
PersonTrackingScope
parentScope: TextureTrackingScope
personIndex: number
Physics
createGlobalProbe(): Probe
createRootProbe(): Probe
getRootWorldSettings(): Physics.WorldSettingsAsset
Physics
Constraint
create(type: Physics.ConstraintType): Physics.Constraint
ConstraintType
Fixed: number
Hinge: number
Point: number
Filter
includeDynamic: boolean
includeIntangible: boolean
includeStatic: boolean
onlyColliders: ColliderComponent[]
onlyLayers: LayerSet
skipColliders: ColliderComponent[]
skipLayers: LayerSet
create(): Physics.Filter
ForceMode
Acceleration: number
Force: number
Impulse: number
VelocityChange: number
WorldSettingsAsset
absoluteSpeedLimit: number
defaultFilter: Physics.Filter
defaultMatter: Matter
gravity: vec3
relativeSpeedLimit: number
simulationRate: number
slowDownStep: number
slowDownTime: number
create(): Physics.WorldSettingsAsset
getLayersCollidable(layerNumberA: number, layerNumberB: number): boolean
resetLayerCollisionMatrix(): void
setLayersCollidable(layerNumberA: number, layerNumberB: number, enable: boolean): void
PinToMeshComponent
offsetPosition: vec3
offsetRotation: vec3
orientation: PinToMeshComponent.Orientation
pinUV: vec2
preferedTriangle: number
preferredTriangle: number
preferredUVLayerIndex: number
target: BaseMeshVisual
useInterpolatedVertexNormal: boolean
PinToMeshComponent
Orientation
OnlyPosition: number
PositionAndDirection: number
PinchDownArgs
palmOrientation: vec3
PinchEndEventArgs
scale: number
touches: vec2[]
PinchMoveEventArgs
scale: number
touches: vec2[]
PinchStartEventArgs
scale: number
touches: vec2[]
PinchStrengthArgs
strength: number
PinchUpArgs
palmOrientation: vec3
PitchShifter
maxTensorSize: number
pitch: number
process(inTensor: Float32Array, inShape: vec3, outTensor: Float32Array): vec3
PitchShifterBuilder
build(): PitchShifter
setSampleRate(sampleRate: number): PitchShifterBuilder
PlaybackMode
Loop: number
PingPong: number
Single: number
PointCloud
confidences: number[]
ids: number[]
positions: vec3[]
PointConstraint
PositionEffect
enabled: boolean
PostEffectVisual
Probe
debugDrawEnabled: boolean
filter: Physics.Filter
rayCast(start: vec3, end: vec3, hitCB: (hit: RayCastHit) => void): void
rayCastAll(start: vec3, end: vec3, hitCB: (hit: RayCastHit[]) => void): void
shapeCast(shape: Shape, start: vec3, startRot: quat, end: vec3, endRot: quat, hitCB: (hit: RayCastHit) => void): void
shapeCastAll(shape: Shape, start: vec3, startRot: quat, end: vec3, endRot: quat, hitCB: (hit: RayCastHit[]) => void): void
sphereCast(radius: number, start: vec3, end: vec3, hitCB: (hit: RayCastHit) => void): void
sphereCastAll(radius: number, start: vec3, end: vec3, hitCB: (hit: RayCastHit[]) => void): void
ProceduralMeshRenderObjectProvider
ProceduralTextureProvider
create(width: number, height: number, colorspace: Colorspace): Texture
createFromTexture(texture: Texture): Texture
createWithFormat(width: number, height: number, format: TextureFormat): Texture
getPixels(x: number, y: number, width: number, height: number, data: Uint8Array): void
getPixelsFloat32(x: number, y: number, width: number, height: number, data: Float32Array): void
setPixels(x: number, y: number, width: number, height: number, data: Uint8Array): void
setPixelsFloat32(x: number, y: number, width: number, height: number, data: Float32Array): void
ProcessedLocationModule
Properties
PropertyOverrides
Provider
getLoadStatus(): LoadStatus
ProxyTextureProvider
create(): Texture
QuatAnimationPropertyTrack
QuaternionAnimationTrack
QuaternionAnimationTrackKeyFramed
addKey(time: number, value: quat): void
removeAllKeys(): void
removeKeyAt(index: number): void
QuaternionAnimationTrackXYZEuler
getChildTrackByIndex(index: number): AnimationTrack
setChildTrackByIndex(index: number, track: AnimationTrack): void
RawLocationModule
RayCastHit
collider: ColliderComponent
distance: number
normal: vec3
position: vec3
skipRemaining: boolean
t: number
triangle: TriangleHit
RealtimeStoreCreateOptions
allowOwnershipTakeOver: boolean
create(): RealtimeStoreCreateOptions
initialStore: GeneralDataStore
ownership: RealtimeStoreCreateOptions.Ownership
persistence: RealtimeStoreCreateOptions.Persistence
storeId: string
RealtimeStoreCreateOptions
Ownership
Owned: number
Unowned: number
Persistence
Ephemeral: number
Owner: number
Persist: number
Session: number
Rect
bottom: number
create(left: number, right: number, bottom: number, top: number): Rect
getCenter(): vec2
getSize(): vec2
left: number
right: number
setCenter(value: vec2): void
setSize(value: vec2): void
toString(): string
top: number
RectCropTextureProvider
cropRect: Rect
rotation: number
RectangleSetter
cropTexture: Texture
RemoteApiRequest
body: string|number[]|Uint8Array
create(): RemoteApiRequest
endpoint: string
parameters: Record
RemoteApiResponse
asResource(): DynamicResource
body: string
metadata:
statusCode: number
uriResources: DynamicResource[]
RemoteMediaModule
loadResourceAsAudioTrackAsset(resource: DynamicResource, onSuccess: (audioTrackAsset: AudioTrackAsset) => void, onFailure: (errorMessage: string) => void): void
loadResourceAsBytes(resource: DynamicResource, onSuccess: (bytes: Uint8Array) => void, onFailure: (errorMessage: string) => void): void
loadResourceAsGaussianSplattingAsset(resource: DynamicResource, onSuccess: (gaussianSplattingAsset: GaussianSplattingAsset) => void, onFailure: (errorMessage: string) => void): void
loadResourceAsGltfAsset(resource: DynamicResource, onSuccess: (glTFAsset: GltfAsset) => void, onFailure: (errorMessage: string) => void): void
loadResourceAsImageTexture(resource: DynamicResource, onSuccess: (texture: Texture) => void, onFailure: (errorMessage: string) => void): void
loadResourceAsRuntimeBundle(resource: DynamicResource, onSuccess: (asset: Asset) => void, onFailure: (errorMessage: string) => void): void
loadResourceAsString(resource: DynamicResource, onSuccess: (string: string) => void, onFailure: (errorMessage: string) => void): void
loadResourceAsVideoTexture(resource: DynamicResource, onSuccess: (texture: Texture) => void, onFailure: (errorMessage: string) => void): void
RemoteReferenceAsset
downloadAsset(onDownloaded: (asset: Asset) => void, onFailed: () => void): void
RemoteServiceHttpRequest
body: string|number[]|Uint8Array
contentType: string
create(): RemoteServiceHttpRequest
getHeader(name: string): string
headers:
method: RemoteServiceHttpRequest.HttpRequestMethod
setHeader(name: string, value: string): void
url: string
RemoteServiceHttpRequest
HttpRequestMethod
Delete: number
Get: number
Patch: number
Post: number
Put: number
RemoteServiceHttpResponse
asResource(): DynamicResource
body: string
contentType: string
getHeader(name: string): string
headers:
loadAsTexture(): Texture
statusCode: number
RemoteServiceModule
createAPIWebSocket(endpoint: string, params: any): WebSocket
createWebSocket(url: string): WebSocket
createWebView(options: WebViewOptions, onSuccess: (texture: Texture) => void, onFailure: (errorMessage: string) => void): void
createWebViewOptions(resolution: vec2): WebViewOptions
fetch(request: string|Request, options: any): Promise
makeResourceFromUrl(mediaUrl: string): DynamicResource
performApiRequest(request: RemoteApiRequest, onApiResponse: (response: RemoteApiResponse) => void): void
performHttpRequest(requestOptions: RemoteServiceHttpRequest, onHttpResponse: (response: RemoteServiceHttpResponse) => void): void
subscribeApiRequest(request: RemoteApiRequest, onApiResponse: (response: RemoteApiResponse) => void): string
RenderMesh
aabbMax: vec3
aabbMin: vec3
control: RenderObjectProvider
extractBoneInverseMatrices(): mat4[]
extractBoneNames(): string[]
extractIndices(): number[]
extractVerticesForAttribute(attributeName: string): number[]
getIndexBuffer(): Uint16Array|Uint32Array
getVertexDataForAttribute(attributeName: string): Float32Array
indexType: MeshIndexType
topology: MeshTopology
RenderMeshVisual
blendNormals: boolean
blendShape: BlendShapes
blendShapesEnabled: boolean
clearBlendShapeWeights(): void
emitter: boolean
getBlendShapeNames(): string[]
getBlendShapeWeight(name: string): number
hasBlendShapeWeight(name: string): boolean
mesh: RenderMesh
receiver: boolean
setBlendShape(value: BlendShapes): void
setBlendShapeWeight(name: string, weight: number): void
setSkin(value: Skin): void
unsetBlendShapeWeight(name: string): void
RenderObjectProvider
RenderTargetProvider
antialiasingMode: RenderTargetProvider.AntialiasingMode
antialiasingQuality: RenderTargetProvider.AntialiasingQuality
clearColor: vec4
clearColorEnabled: boolean
clearColorOption: ClearColorOption
clearDepthEnabled: boolean
depthBufferUsage: RenderTargetProvider.DepthBufferUsage
inputTexture: Texture
mipmapsEnabled: boolean
msaaStrategy: RenderTargetProvider.MSAAStrategy
outputResolution: RenderTargetProvider.OutputResolution
resolution: vec2
resolutionScale: number
sliceCount: number
textureType: RenderTargetProvider.TextureType
useScreenResolution: boolean
RenderTargetProvider
AntialiasingMode
Disabled: number
MSAA: number
AntialiasingQuality
Default: number
High: number
Low: number
Medium: number
Ultra: number
DepthBufferUsage
Auto: number
ForceOff: number
ForceOn: number
MSAAStrategy
Default: number
OnlyWhenRequired: number
OutputResolution
Camera: number
Custom: number
Screen: number
TextureType
Texture2D: number
Texture2DArray: number
Texture3D: number
TextureCubemap: number
Request
bodyUsed: boolean
bytes(): Promise
headers: Headers
json(): Promise
method: string
redirect: string
text(): Promise
url: string
Response
blob(): Promise
bodyUsed: boolean
bytes(): Promise
headers: Headers
json(): Promise
ok: boolean
status: number
statusText: string
text(): Promise
url: string
RetouchVisual
eyeSharpeningEnabled: boolean
eyeWhiteningEnabled: boolean
eyeWhiteningIntensity: number
faceIndex: number
isAuto(): boolean
lookupTexture: Texture
maskTexture: Texture
sharpenEyeIntensity: number
softSkinEnabled: boolean
softSkinIntensity: number
softSkinRadius: number
teethWhiteningEnabled: boolean
teethWhiteningIntensity: number
trackingScope: TextureTrackingScope|PersonTrackingScope|FaceTrackingScope
ReverseCameraTextureProvider
RotatedRect
angle: number
center: vec2
create(center: vec2, size: vec2, angle: number): RotatedRect
size: vec2
toString(): string
RotationOptions
invertRotation: boolean
SafeSnapchatUser
hasBitmoji: boolean
Sampler
SamplerBuilder
build(): Sampler
setBorderColor(borderColor: vec4): SamplerBuilder
setFilteringMode(filteringMode: FilteringMode): SamplerBuilder
setUseMipmaps(value: boolean): SamplerBuilder
setWrapMode(wrapMode: WrapMode): SamplerBuilder
setWrapUMode(wrapMode: WrapMode): SamplerBuilder
setWrapVMode(wrapMode: WrapMode): SamplerBuilder
setWrapWMode(wrapMode: WrapMode): SamplerBuilder
SamplerWrapper
filtering: FilteringMode
texture: Texture
wrap: WrapMode
wrapU: WrapMode
wrapV: WrapMode
wrapW: WrapMode
SamplerWrappers
ScanModule
scan(contexts: string[], scanComplete: (resultJson: string) => void, scanFailed: (failureMessage: string) => void): void
scanTarget: Texture
ScanModule
Contexts
Cars: string
Dogs: string
Objects: string
Places: string
SceneEvent
bind(evCallback: (arg1: this) => void): void
enabled: boolean
getTypeName(): string
SceneObject
children: SceneObject[]
copyComponent(component: K): K
copySceneObject(sceneObject: SceneObject): SceneObject
copyWholeHierarchy(sceneObject: SceneObject): SceneObject
createComponent(typeName: K): ComponentNameMap[K]
destroy(): void
enabled: boolean
getAllComponents(): Component[]
getChild(index: number): SceneObject
getChildrenCount(): number
getComponent(componentType: K): ComponentNameMap[K]
getComponentByIndex(componentType: K, index: number): ComponentNameMap[K]
getComponentCount(componentType: K): number
getComponentInAncestors(componentType: K, onlyEnabled: boolean, includeSelf: boolean, maxDepth: number): ComponentNameMap[K]
getComponentInDescendants(componentType: K, onlyEnabled: boolean, includeSelf: boolean, maxDepth: number): ComponentNameMap[K]
getComponents(componentType: K): ComponentNameMap[K][]
getComponentsInAncestors(componentType: K, onlyEnabled: boolean, includeSelf: boolean, maxDepth: number): ComponentNameMap[K][]
getComponentsInDescendants(componentType: K, onlyEnabled: boolean, includeSelf: boolean, maxDepth: number): ComponentNameMap[K][]
getFirstComponent(componentType: K): ComponentNameMap[K]
getParent(): SceneObject
getRenderLayer(): number
getTransform(): Transform
hasParent(): boolean
isDescendantOf(potentialAncestor: SceneObject): boolean
isEnabledInHiearchy: boolean
isEnabledInHierarchy: boolean
layer: LayerSet
name: string
onDisabled: event0
onEnabled: event0
removeParent(): void
setParent(newParent: SceneObject): void
setParentPreserveWorldTransform(newParent: SceneObject): void
setRenderLayer(id: number): void
SceneObjectEvent
getSceneObject(): SceneObject
ScreenRegionComponent
region: ScreenRegionType
ScreenRegionType
Capture: number
FullFrame: number
Preview: number
RoundButton: number
SafeRender: number
ScreenTextureProvider
ScreenTransform
anchors: Rect
containsLocalPoint(localPoint: vec2): boolean
containsScreenPoint(screenPoint: vec2): boolean
containsWorldPoint(worldPoint: vec3): boolean
enableDebugRendering: boolean
isInScreenHierarchy(): boolean
localPointToScreenPoint(relativeLocalPoint: vec2): vec2
localPointToWorldPoint(relativeLocalPoint: vec2): vec3
offsets: Rect
pivot: vec2
position: vec3
rotation: quat
scale: vec3
screenPointToLocalPoint(screenPoint: vec2): vec2
screenPointToParentPoint(screenPoint: vec2): vec2
worldPointToLocalPoint(worldPoint: vec3): vec2
worldPointToParentPoint(worldPoint: vec3): vec2
ScriptAsset
ScriptComponent
api: Record
createEvent(eventType: K): EventNameMap[K]
removeEvent(event: SceneEvent): void
ScriptObject
getTypeName(): string
isOfType(type: string): boolean
isSame(other: ScriptObject): boolean
ScriptScene
captureTarget: Texture
createDepthStencilRenderTargetTexture(): Texture
createRenderTargetTexture(): Texture
createSceneObject(name: string): SceneObject
getCameraType(): string
getRootObject(index: number): SceneObject
getRootObjectsCount(): number
isRayTracingSupported: boolean
isRecording(): boolean
liveOverlayTarget: Texture
liveTarget: Texture
ScrollEndEventArgs
position: vec2
ScrollEventArgs
delta: vec2
position: vec2
ScrollStartEventArgs
position: vec2
SegmentationModel
SegmentationTextureProvider
getMaskPercentage(): number
onMaskPercentageUpdated: event1
trackingScope: TextureTrackingScope
SelectEndEventArgs
SelectStartEventArgs
SerializableWithUID
uniqueIdentifier: string
Shape
createBoxShape(): BoxShape
createCapsuleShape(): CapsuleShape
createConeShape(): ConeShape
createCylinderShape(): CylinderShape
createLevelsetShape(): LevelsetShape
createMeshShape(): MeshShape
createSphereShape(): SphereShape
ShoppingModule
domains: DomainInfo[]
loadingStarted(): any
onError: event2
onProductStateUpdate: event1
onProductsLoaded: event1
selectProduct(index: number): void
Skin
clearBones(): void
getSkinBone(boneName: string): SceneObject
getSkinBoneNames(): string[]
setSkinBone(boneName: string, bone: SceneObject): void
SmileFinishedEvent
SmileStartedEvent
SnapData
addUserMention(user: SnapchatUser): void
SnapImageCaptureEvent
SnapOS
SnapRecordStartEvent
SnapRecordStopEvent
SnapchatFriendUserInfo
friendshipStart: Date
lastInteractionTime: Date
SnapchatUser
birthday: SnapchatUserBirthday
displayName: string
friendInfo: SnapchatFriendUserInfo
userName: string
zodiac: Zodiac
SnapchatUserBirthday
day: number
month: number
SnapcodeMarkerProvider
SortOrder
Ascending: number
Descending: number
SoundSync
allBeatsTimestampMS: number[]
beatPeriodMS: number
beatsPerMinute: number
downbeatsTimestampsMS: number[]
numBeatsInMeasure: number
trackDurationSeconds: number
SoundSyncBeat
beatIndex: number
timestamp: number
SoundSyncTracker
fullSoundSync: SoundSync
isPlaying: boolean
onBeat: event1
onDownBeat: event1
onPlaybackReset: event0
onPlaybackStarted: event1
onSoundSyncAvailable: event0
onSoundSyncCleared: event0
playbackPosition: number
SourceMaps
applyToStackTrace(trace: string): string
SpatialAudio
directivityEffect: DirectivityEffect
distanceEffect: DistanceEffect
enabled: boolean
positionEffect: PositionEffect
SpectaclesHandSpecificData
SpectaclesMobileKitModule
createSession(): SpectaclesMobileKitSession
SpectaclesMobileKitSession
close(): void
isConnected: boolean
onConnected: event0
onDisconnected: event0
sendData(data: string): void
sendRequest(data: string): Promise
start(): void
startSubscription(data: string, onError: (error: string) => void): event1
stopSubscription(id: event1): void
Spectrogram
maxTensorSize: number
process(inTensor: Float32Array, inShape: vec3, outTensor: Float32Array): vec3
SpectrogramBuilder
build(): Spectrogram
setFFTSize(fftSize: number): SpectrogramBuilder
setFrameSize(frameSize: number): SpectrogramBuilder
setHopSize(hopSize: number): SpectrogramBuilder
SphereShape
radius: number
SplineComponent
SpriteAligner
bindingPoint: vec2
size: vec2
SpriteVisual
fillMode: number
flipX: boolean
flipY: boolean
getMeshSize(): vec2
pivot: vec2
StateInfo
description: string
name: string
StencilClearOption
CustomTexture: number
CustomValue: number
None: number
StencilFace
Back: number
Front: number
FrontAndBack: number
StencilFunction
Always: number
Equal: number
Greater: number
GreaterEqual: number
Less: number
LessEqual: number
Never: number
NotEqual: number
StencilOperation
DecrementClamp: number
DecrementWrap: number
IncrementClamp: number
IncrementWrap: number
Invert: number
Keep: number
Replace: number
Zero: number
StencilState
depthFailureOperation: StencilOperation
depthStencilPassOperation: StencilOperation
enabled: boolean
face: StencilFace
readMask: number
referenceValue: number
stencilCompareFunction: StencilFunction
stencilFailureOperation: StencilOperation
writeMask: number
StorageOptions
create(): StorageOptions
scope: StorageScope
StorageScope
Session: number
User: number
StretchMode
Fill: number
FillAndCut: number
Fit: number
FitHeight: number
FitWidth: number
Stretch: number
StretchPoint
delta: vec3
index: number
weight: number
Studio
log(message: any): void
SupabaseModule
performSupabaseRequest(request: string|Request, options: any): Promise
SupabaseProject
id: string
name: string
publicToken: string
url: string
SurfaceClassification
Ground: number
None: number
SurfaceOptions
enhanceWithNativeAR: boolean
SurfaceTrackingResetEvent
TangentType
Broken: number
Clamped: number
Const: number
Free: number
Linear: number
TapEvent
getTapPosition(): vec2
TapEventArgs
position: vec2
TargetingDataArgs
handIntendsToTarget: boolean
isValid: boolean
rayDirectionInWorld: vec3
rayOriginInWorld: vec3
TensorMath
addScalar(inTensor: Float32Array, scalar: number, outTensor: Float32Array): void
addTensors(inTensorA: Float32Array, inShapeA: vec3, inTensorB: Float32Array, inShapeB: vec3, outTensor: Float32Array): void
amplitudeToDb(inTensor: Float32Array, outTensor: Float32Array): void
applyBoxFilter(inTensor: Float32Array, inShape: vec3, kernelSize: vec2, anchor: vec2, normalize: boolean, borderType: TensorMath.BorderType, outTensor: Float32Array): void
applyNMS(inTensor: Float32Array, inShape: vec3, scores: Float32Array, scoreThreshold: number, iouThreshold: number, outTensor: Uint32Array): number
applyThreshold(inTensor: Float32Array, threshold: number, maxValue: number, type: TensorMath.ThresholdMethod, outTensor: Float32Array): void
approximatePolygonalCurve(inTensor: Float32Array, inShape: vec3, epsilon: number, closed: boolean, outTensor: Float32Array): number
argMax(inTensor: Float32Array, inShape: vec3, outTensor: Uint32Array): void
argSort(inTensor: Float32Array, shape: vec3, axis: number, outTensor: Uint32Array): void
argSortMasked(inTensor: Float32Array, mask: Float32Array, outTensor: Uint32Array, order: SortOrder): number
clamp(inTensor: Float32Array, minVal: number, maxVal: number, outTensor: Float32Array): void
concat(inTensorA: Float32Array, inShapeA: vec3, inTensorB: Float32Array, inShapeB: vec3, axis: number, outTensor: Float32Array): void
dilate(inTensor: Float32Array, inShape: vec3, kernelTensor: Float32Array, kernelShape: vec3, anchor: vec2, iterations: number, borderType: TensorMath.BorderType, borderValue: vec4, outTensor: Float32Array): void
divTensors(inTensorA: Float32Array, inShapeA: vec3, inTensorB: Float32Array, inShapeB: vec3, outTensor: Float32Array): void
drawLine(imgTensor: Float32Array, imgShape: vec3, point1: vec2, point2: vec2, color: vec4, thickness: number, lineType: number, shift: number): void
erode(inTensor: Float32Array, inShape: vec3, kernelTensor: Float32Array, kernelShape: vec3, anchor: vec2, iterations: number, borderType: TensorMath.BorderType, borderValue: vec4, outTensor: Float32Array): void
fillConvexPoly(imgTensor: Float32Array, imgShape: vec3, pointsTensor: Int32Array, pointsShape: vec3, color: vec4, lineType: number, shift: number): void
fillPoly(imgTensor: Float32Array, imgShape: vec3, polygonsTensors: Int32Array[], color: vec4, lineType: number, shift: number, offset: vec2): void
findContours(inTensor: Uint8Array, inShape: vec3, mode: number, method: number, offset: vec2, outTensor: Int32Array): number[]
findMinDistancesBetween(from: Float32Array, fromShape: vec3, to: Float32Array, toShape: vec3, output: Float32Array): void
getContour(grayscaledTexture: Float32Array, textureShape: vec3, threshold: number, winSize: number, maxNearCount: number, outTensor: Float32Array): number
getRotatedRectPoints(rotatedRect: RotatedRect, outTensor: Float32Array): void
getVectorsLength(vectors: Float32Array, vectorsShape: vec3, output: Float32Array): void
isInRectangle(points: Float32Array, pointsShape: vec3, rect: Rect, output: Uint8Array): void
max(inTensor: Float32Array, inShape: vec3, outTensor: Float32Array): void
maxDistanceBetweenPoints(points: Float32Array, pointsShape: vec3): number
maxInSlideWindow(tensor: Float32Array, tensorShape: vec3, window: vec3, output: Uint32Array): void
min(inTensor: Float32Array, inShape: vec3, outTensor: Float32Array): void
minAreaRect(inTensor: Float32Array, inShape: vec3): RotatedRect
minInSlideWindow(tensor: Float32Array, tensorShape: vec3, window: vec3, output: Uint32Array): void
mulMatToPoints(pointsTensor: Float32Array, pointsShape: vec3, matrix: mat4, outTensor: Float32Array): void
mulScalar(inTensor: Float32Array, scalar: number, outTensor: Float32Array): void
mulTensors(inTensorA: Float32Array, inShapeA: vec3, inTensorB: Float32Array, inShapeB: vec3, outTensor: Float32Array): void
opticalFlow(prevGrayscale: Uint8Array, grayscale: Uint8Array, textureShape: vec3, prevPoints: Float32Array, points: Float32Array, pointsShape: vec3, winSize: vec2, maxLevel: number, maxCount: number, epsilon: number): void
permute(inTensor: Float32Array, inShape: vec3, permuteAxis: vec3, outTensor: Float32Array): void
polarSort2d(inTensor: Float32Array, tensorShape: vec3, center: vec2): void
power(inTensor: Float32Array, val: number, outTensor: Float32Array): void
powerToDb(inTensor: Float32Array, topDb: number, outTensor: Float32Array): void
projectPoints(pointsTensor: Float32Array, pointsShape: vec3, projectionMatrix: mat4, outTensor: Float32Array): void
repeat(inTensor: Float32Array, inShape: vec3, axis: vec3, outTensor: Float32Array): void
rotatePoints3d(points: Float32Array, pointsShape: vec3, rotation: quat, outPoints: Float32Array): void
smoothPoints(inTensor: Float32Array, tensorShape: vec3, step: number, outTensor: Float32Array): void
softArgMax(inTensor: Float32Array, inShape: vec3, outTensor: Float32Array, normalized: boolean): void
softMax(inTensor: Float32Array, inShape: vec3, outTensor: Float32Array): void
solvePnP(inObjectPoints: Float32Array, inImagePoints: Float32Array, imagePointsShape: vec3, transform: mat3, flags: number, outRotTrans: Float32Array): boolean
solvePnPExtended(inObjectPoints: Float32Array, inImagePoints: Float32Array, imagePointsShape: vec3, cameraIntrinsicsMatrix: mat3, distortionCoeff: Float32Array, distortionCoeffShape: vec3, useExtrinsicGuess: boolean, flags: number, outRotTrans: Float32Array): boolean
solvePnPRansac(inObjectPoints: Float32Array, inImagePoints: Float32Array, imagePointsShape: vec3, cameraIntrinsicsMatrix: mat3, distortionCoeff: Float32Array, distortionCoeffShape: vec3, useExtrinsicGuess: boolean, iterationsCount: number, reprojectionError: number, confidence: number, flags: number, outInliers: Uint8Array, outRotTrans: Float32Array): boolean
subTensors(inTensorA: Float32Array, inShapeA: vec3, inTensorB: Float32Array, inShapeB: vec3, outTensor: Float32Array): void
subpixelArgMax(inTensor: Float32Array, inShape: vec3, outTensor: Float32Array, kernelSize: number): void
sum(inTensor: Float32Array, inShape: vec3, axis: vec3, outTensor: Float32Array): void
textureToGrayscale(texture: Texture, grayscaleBuffer: Uint8Array, grayscaleBufferShape: vec3): void
TensorMath
BorderType
Constant: number
Reflect: number
Reflect101: number
Replicate: number
ThresholdMethod
Binary: number
BinaryInv: number
ToZero: number
ToZeroInv: number
Trunc: number
Text
backgroundSettings: BackgroundSettings
blendMode: BlendMode
capitilizationOverride: CapitilizationOverride
colorMask: vec4b
depthTest: boolean
dropshadowSettings: DropshadowSettings
editable: boolean
font: Font
getBoundingBox(start: number, end: number): Rect
horizontalOverflow: HorizontalOverflow
italic: boolean
letterSpacing: number
lineSpacing: number
onEditingFinished: event1
onEditingStarted: event0
onEditingUpdated: event1
outlineSettings: OutlineSettings
showEditingPreview: boolean
size: number
sizeToFit: boolean
text: string
textFill: TextFill
touchHandler: InteractionComponent
twoSided: boolean
verticalOverflow: VerticalOverflow
weight: number
worldSpaceRect: Rect
Text3D
capitilizationOverride: CapitilizationOverride
editable: boolean
enableBatching: boolean
extrudeDirection: number
extrusionDepth: number
font: Font
getBoundingBox(start: number, end: number): Rect
horizontalOverflow: HorizontalOverflow
italic: boolean
letterSpacing: number
lineSpacing: number
onEditingFinished: event1
onEditingStarted: event0
onEditingUpdated: event1
showEditingPreview: boolean
size: number
sizeToFit: boolean
split(): RenderMeshVisual[]
text: string
touchHandler: InteractionComponent
verticalOverflow: VerticalOverflow
weight: number
worldSpaceRect: Rect
TextDecoder
decode(data: Uint8Array): string
encoding: string
TextEncoder
encode(value: string): Uint8Array
encodeInto(value: string, result: Uint8Array): void
encoding: string
TextFill
color: vec4
colorTint: vec4
mode: TextFillMode
texture: Texture
textureStretch: StretchMode
tileCount: number
tileZone: TileZone
TextFillMode
Solid: number
Texture: number
TextInputModule
TextInputSystem
dismissKeyboard(): void
requestKeyboard(options: TextInputSystem.KeyboardOptions): void
setEditingPosition(position: number): void
setSelectedTextRange(range: vec2): void
TextInputSystem
KeyboardOptions
enablePreview: boolean
initialSelectedRange: vec2
initialText: string
keyboardType: TextInputSystem.KeyboardType
onError: (error: number, description: string) => void
onKeyboardStateChanged: (keyboardIsOpen: boolean) => void
onReturnKeyPressed: () => void
onTextChanged: (text: string, range: vec2) => void
returnKeyType: TextInputSystem.ReturnKeyType
KeyboardType
Num: number
Password: number
Phone: number
Pin: number
Text: number
Url: number
ReturnKeyType
Done: number
Go: number
Next: number
Return: number
Search: number
Send: number
TextProvider
fontAsset: Font
outlineColor: vec4
outlineSize: number
shadowColor: vec4
shadowOffset: vec2
size: number
text: string
textColor: vec4
useDropshadow: boolean
useOutline: boolean
TextToSpeech
TextToSpeech
Options
voiceName: string
create(): TextToSpeech.Options
PhonemeInfo
endTime: number
isAbusive: boolean
phoneme: string
startTime: number
VoiceNames
WordInfo
endTime: number
startTime: number
word: string
TextToSpeechModule
synthesize(input: string, options: TextToSpeech.Options, onTTSComplete: (audioTrackAsset: AudioTrackAsset, wordInfo: TextToSpeech.WordInfo[], phonemeInfo: TextToSpeech.PhonemeInfo[], voiceStyle: any) => void, onTTSError: (error: number, description: string) => void): void
Texture
control: TextureProvider
copyFrame(): Texture
createMarkerAsset(): MarkerAsset
getColorspace(): Colorspace
getFormat(): TextureFormat
getHeight(): number
getWidth(): number
TextureFormat
BGRA8Unorm: number
R16Float: number
R16Sint: number
R16Snorm: number
R16Uint: number
R16Unorm: number
R32Float: number
R32Sint: number
R32Uint: number
R8Sint: number
R8Snorm: number
R8Uint: number
R8Unorm: number
RG11B10Float: number
RG16Float: number
RG16Sint: number
RG16Snorm: number
RG16Uint: number
RG16Unorm: number
RG32Float: number
RG32Sint: number
RG32Uint: number
RG8Sint: number
RG8Snorm: number
RG8Uint: number
RG8Unorm: number
RGB10A2Uint: number
RGB10A2Unorm: number
RGB8Unorm: number
RGBA16Float: number
RGBA16Sint: number
RGBA16Snorm: number
RGBA16Uint: number
RGBA16Unorm: number
RGBA32Float: number
RGBA32Sint: number
RGBA32Uint: number
RGBA8Sint: number
RGBA8Snorm: number
RGBA8Srgb: number
RGBA8Uint: number
RGBA8Unorm: number
TextureProvider
getAspect(): number
getHeight(): number
getWidth(): number
TextureStretchMode
Fill: number
Fit: number
FitHeight: number
FitWidth: number
Stretch: number
TextureTrackingScope
texture: Texture
TileZone
Character: number
Extents: number
Rect: number
Screen: number
TouchDataProvider
composeTouchBlockingExceptionMask(currentMask: number, newException: string): number
enableTouchBlockingException(exception: string, enable: boolean): void
touchBlocking: boolean
touchBlockingExceptionMask: number
TouchEndEvent
getTouchId(): number
getTouchPosition(): vec2
isCancelled(): boolean
TouchEndEventArgs
position: vec2
touchId: number
TouchMoveEvent
getTouchId(): number
getTouchPosition(): vec2
TouchMoveEventArgs
position: vec2
touchId: number
TouchStartEvent
getTouchId(): number
getTouchPosition(): vec2
TouchStartEventArgs
position: vec2
touchId: number
TouchState
Began: number
Cancelled: number
Ended: number
Moved: number
TrackedMesh
isValid: boolean
transform: mat4
TrackedMeshFaceClassification
Ceiling: number
Door: number
Floor: number
None: number
Seat: number
Table: number
Wall: number
Window: number
TrackedMeshHistogramResult
avgNormal: vec3
histogram: number[]
TrackedMeshHitTestResult
classification: TrackedMeshFaceClassification
mesh: TrackedMesh
normal: vec3
position: vec3
TrackedPlane
isValid: boolean
mesh: RenderMesh
orientation: TrackedPlaneOrientation
pivot: vec3
size: vec3
transform: mat4
TrackedPlaneOrientation
Horizontal: number
Vertical: number
TrackedPoint
orientation: quat
position: vec3
TrackedPointComponent
isValid: boolean
trackedPoint: TrackedPoint
TrackingScope
Transform
back: vec3
down: vec3
forward: vec3
getInvertedWorldTransform(): mat4
getLocalPosition(): vec3
getLocalRotation(): quat
getLocalScale(): vec3
getSceneObject(): SceneObject
getWorldPosition(): vec3
getWorldRotation(): quat
getWorldScale(): vec3
getWorldTransform(): mat4
left: vec3
right: vec3
segmentScaleCompensate: boolean
setLocalPosition(pos: vec3): void
setLocalRotation(rotation: quat): void
setLocalScale(scale: vec3): void
setLocalTransform(transformMat: mat4): void
setWorldPosition(pos: vec3): void
setWorldRotation(rotation: quat): void
setWorldScale(scale: vec3): void
setWorldTransform(transformMat: mat4): void
up: vec3
Transformer
inverseMatrix: mat3
matrix: mat3
TransformerBuilder
build(): Transformer
setFillColor(color: vec4): TransformerBuilder
setFlipX(value: boolean): TransformerBuilder
setFlipY(value: boolean): TransformerBuilder
setHorizontalAlignment(mode: HorizontalAlignment): TransformerBuilder
setRotation(mode: TransformerRotation): TransformerBuilder
setStretch(value: boolean): TransformerBuilder
setVerticalAlignment(mode: VerticalAlignment): TransformerBuilder
TransformerRotation
None: number
Rotate180: number
Rotate270: number
Rotate90: number
TriangleHit
barycentricCoordinate: vec3
index: number
mesh: CollisionMesh
vertexIndices: number[]
vertexPositions: vec3[]
TriggerPrimaryEvent
position: vec2
TriggerPrimaryEventArgs
TurnOffEvent
TurnOnEvent
UpdateEvent
getDeltaTime(): number
UpperBodyRenderObjectProvider
faceIndex: number
UpperBodyTrackingAsset
UserContextSystem
getAllFriends(callback: (data: SnapchatUser[]) => void): void
getAllFriendsSafeInfo(callback: (data: SafeSnapchatUser[]) => void): void
getBestFriends(callback: (data: SnapchatUser[]) => void): void
getCurrentUser(callback: (data: SnapchatUser) => void): void
getCurrentUserSafeInfo(callback: (data: SafeSnapchatUser) => void): void
getMyAIUser(callback: (data: SnapchatUser) => void): void
getMyAIUserSafeInfo(callback: (data: SafeSnapchatUser) => void): void
getPinnedBestFriends(callback: (data: SnapchatUser[]) => void): void
getUsersInCurrentContext(callback: (data: SnapchatUser[]) => void): void
getUsersInCurrentContextSafeInfo(callback: (data: SafeSnapchatUser[]) => void): void
loadResourceAsSnapchatUser(resource: DynamicResource, onSuccess: (snapchatUser: SnapchatUser) => void, onFailure: (errorMessage: string) => void): void
requestAltitudeFormatted(callback: (formattedData: string) => void): void
requestAltitudeInMeters(callback: (data: number) => void): void
requestBirthdate(callback: (data: Date) => void): void
requestBirthdateFormatted(callback: (formattedData: string) => void): void
requestCity(callback: (data: string) => void): void
requestDisplayName(callback: (data: string) => void): void
requestTemperatureCelsius(callback: (data: number) => void): void
requestTemperatureFahrenheit(callback: (data: number) => void): void
requestTemperatureFormatted(callback: (formattedData: string) => void): void
requestUsername(callback: (data: string) => void): void
requestWeatherCondition(callback: (data: WeatherCondition) => void): void
requestWeatherLocalized(callback: (formattedData: string) => void): void
Utf8
decode(data: Uint8Array): string
encode(value: string): Uint8Array
VFXAsset
clone(): VFXAsset
feedbacks: PassWrappers
fixedDeltaTime: number
mesh: RenderMesh
outputs: PassWrappers
playRate: number
properties: Properties
simulations: PassWrappers
useFixedDeltaTime: boolean
VFXComponent
asset: VFXAsset
clear(): void
emitting: boolean
paused: boolean
restart(): void
time(): number
Vec2AnimationTrack
Vec2AnimationTrackKeyFramed
addKey(time: number, value: vec2): void
removeAllKeys(): void
removeKeyAt(index: number): void
Vec3AnimationPropertyTrack
Vec3AnimationTrack
Vec3AnimationTrackKeyFramed
addKey(time: number, value: vec3): void
removeAllKeys(): void
removeKeyAt(index: number): void
Vec3AnimationTrackXYZ
getChildTrackByIndex(index: number): AnimationTrack
setChildTrackByIndex(index: number, track: AnimationTrack): void
Vec3CurveAnimationPropertyTrack
Vec4AnimationTrack
Vec4AnimationTrackKeyFramed
addKey(time: number, value: vec4): void
removeAllKeys(): void
removeKeyAt(index: number): void
VertexCache
currentTime: number
weight: number
VertexSimulationSettings
bendStiffness: number
bendStiffnessGlobalWeight: number
friction: number
frictionGlobalWeight: number
mass: number
massGlobalWeight: number
stretchStiffness: number
stretchStiffnessGlobalWeight: number
VerticalAlignment
Bottom: number
Center: number
Top: number
VerticalOverflow
Overflow: number
Shrink: number
Truncate: number
VideoRecorder
cancelRecording(): void
create(options: VideoRecorder.Options): VideoRecorder
startRecording(): void
stopRecording(): Promise
VideoRecorder
Options
saveThumbnail: boolean
sourceTexture: Texture
textureScale: number
VideoStatus
Paused: number
Playing: number
Preparing: number
Stopped: number
VideoTextureProvider
currentPlayCount: number
currentTime: number
duration: number
getCurrentPlayCount(): number
getStatus(): VideoStatus
isPlaybackReady: boolean
lastFrameTime: number
onPlaybackDone: event0
onPlaybackReady: event0
pause(): void
play(playCount: number): void
playbackRate: number
relativeEndTime: number
relativeStartTime: number
resume(): void
seek(value: number): boolean
setOnFinish(callback: () => void): void
setOnReady(onReadyCallback: () => void): void
status: VideoStatus
stop(): void
totalDuration: number
volume: number
Visual
getRenderOrder(): number
renderOrder: number
setRenderOrder(value: number): void
VoiceML
VoiceML
AdditionalParam
key: string
value: string
BaseNlpModel
addParam(key: string, value: string): void
BaseNlpResponse
additionalParams: VoiceML.AdditionalParam[]
modelName: string
status: VoiceML.NlpResponseStatus
KeywordModelGroup
keywords: string[]
name: string
ListeningErrorEventArgs
description: string
error: number
ListeningOptions
languageCode: string
nlpModels: VoiceML.BaseNlpModel[]
postProcessingActions: VoiceML.PostProcessingAction[]
shouldReturnAsrTranscription: boolean
shouldReturnInterimAsrTranscription: boolean
speechContexts: VoiceML.SpeechContext[]
speechRecognizer: string
addSpeechContext(phrases: string[], boost: number): void
create(): VoiceML.ListeningOptions
ListeningUpdateEventArgs
isFinalTranscription: boolean
transcription: string
getCommandResponses(): VoiceML.NlpCommandResponse[]
getIntentResponses(): VoiceML.NlpIntentResponse[]
getKeywordResponses(): VoiceML.NlpKeywordResponse[]
getQnaResponses(): VoiceML.QnaResponse[]
NlpCommandResponse
command: string
NlpIntentModel
possibleIntents: string[]
NlpIntentResponse
intent: string
NlpIntentsModelOptions
create(intentModelName: string): VoiceML.NlpIntentModel
NlpKeywordModel
keywordGroups: VoiceML.KeywordModelGroup[]
addKeywordGroup(name: string, keywords: string[]): void
NlpKeywordModelOptions
create(): VoiceML.NlpKeywordModel
NlpKeywordResponse
keywords: string[]
NlpResponseStatus
code: number
description: string
PostProcessingAction
PostProcessingActionResponse
id: number
status: VoiceML.PostProcessingActionResponseStatus
PostProcessingActionResponseStatus
code: number
description: string
QnaAction
context: string
create(context: string): VoiceML.QnaAction
QnaResponse
answer: string
answerStatusCode: number
SpeechContext
boost: number
phrases: string[]
VoiceMLModule
enableSystemCommands(): void
onListeningDisabled: event0
onListeningEnabled: event0
onListeningError: event1
onListeningUpdate: event1
startListening(options: VoiceML.ListeningOptions): void
stopListening(): void
VoiceMLModule
AnswerStatusCodes
NOT_A_QUESTION: number
NO_ANSWER_FOUND: number
STATUS_OK: number
UNSET: number
NlpResponsesStatusCodes
ERROR: number
OK: number
SpeechRecognizer
Default: string
WeatherCondition
ClearNight: number
Cloudy: number
Hail: number
Lightning: number
LowVisibility: number
PartlyCloudy: number
Rainy: number
Snow: number
Sunny: number
Unknown: number
Windy: number
WebPageTextureProvider
canGoBack: boolean
canGoForward: boolean
getUserAgent(): string
goBack(): void
goForward(): void
loadUrl(url: string): void
onReady: event0
reload(): void
setUserAgent(userAgent: string): void
stop(): void
touch(id: number, state: TouchState, x: number, y: number): void
WebSocket
addEventListener(type: string, listener: (event: WebSocketEvent) => void): void
binaryType: string
close(): void
onclose: (event: WebSocketCloseEvent) => void
onerror: (event: WebSocketEvent) => void
onmessage: (event: WebSocketMessageEvent) => void
onopen: (event: WebSocketEvent) => void
readyState: number
send(data: string|Uint8Array): void
url: string
WebSocketCloseEvent
code: number
reason: string
wasClean: boolean
WebSocketEvent
WebSocketMessageEvent
data: string|Blob
type: string
WebViewOptions
requestPolicy: WebViewPolicy
resolution: vec2
WebViewPolicy
allow: string[]
block: string[]
WeightedMode
Absolute: number
Both: number
Easing: number
Left: number
None: number
Right: number
Slope: number
WorldComponent
createProbe(): Probe
updateOrder: number
worldSettings: Physics.WorldSettingsAsset
WorldDepthTextureProvider
sampleDepthAtPoint(point: vec2): number
WorldOptions
enableWorldMeshesClassificationTracking: boolean
enableWorldMeshesTracking: boolean
nativePlaneTrackingType: NativePlaneTrackingType
pointCloudEnabled: boolean
WorldQueryHitTestResult
classification: SurfaceClassification
normal: vec3
position: vec3
WorldQueryModule
createHitTestSession(): HitTestSession
createHitTestSessionWithOptions(options: HitTestSessionOptions): HitTestSession
WorldRenderObjectProvider
enableWorldMeshesTracking: boolean
faceCount: number
meshClassificationFormat: MeshClassificationFormat
useNormals: boolean
vertexCount: number
WorldTrackingCapabilities
planesTrackingSupported: boolean
sceneReconstructionSupported: boolean
trackedWorldPointsSupported: boolean
WorldTrackingMeshesAddedEvent
getMeshes(): TrackedMesh[]
WorldTrackingMeshesRemovedEvent
getMeshes(): TrackedMesh[]
WorldTrackingMeshesUpdatedEvent
getMeshes(): TrackedMesh[]
WorldTrackingPlanesAddedEvent
getPlanes(): TrackedPlane[]
WorldTrackingPlanesRemovedEvent
getPlanes(): TrackedPlane[]
WorldTrackingPlanesUpdatedEvent
getPlanes(): TrackedPlane[]
WorldUnderstandingModule
WrapMode
ClampToBorder: number
ClampToEdge: number
MirroredRepeat: number
Repeat: number
Zodiac
Aquarius: number
Aries: number
Cancer: number
Capricorn: number
Gemini: number
Leo: number
Libra: number
Pisces: number
Sagittarius: number
Scorpio: number
Taurus: number
Virgo: number
console
debug(data: any[]): void
error(data: any[]): void
info(data: any[]): void
log(data: any[]): void
time(label: any[]): void
timeEnd(label: any[]): void
timeLog(label: any[]): void
trace(data: any[]): void
warn(data: any[]): void
crypto
getRandomValues(typedArray: Uint8Array): Uint8Array
randomUUID(): string
crypto
subtle
digest(algorithm: string, data: Uint8Array): Promise
event0
add(callback: () => R): EventRegistration
remove(eventRegistration: EventRegistration): void
event1
add(callback: (arg0: T0) => R): EventRegistration
remove(eventRegistration: EventRegistration): void
event2
add(callback: (arg0: T0, arg1: T1) => R): EventRegistration
remove(eventRegistration: EventRegistration): void
event3
add(callback: (arg0: T0, arg1: T1, arg2: T2) => R): EventRegistration
remove(eventRegistration: EventRegistration): void
event4
add(callback: (arg0: T0, arg1: T1, arg2: T2, arg3: T3) => R): EventRegistration
remove(eventRegistration: EventRegistration): void
event5
add(callback: (arg0: T0, arg1: T1, arg2: T2, arg3: T3, arg4: T4) => R): EventRegistration
remove(eventRegistration: EventRegistration): void
event6
add(callback: (arg0: T0, arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => R): EventRegistration
remove(eventRegistration: EventRegistration): void
event7
add(callback: (arg0: T0, arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6) => R): EventRegistration
remove(eventRegistration: EventRegistration): void
failAsync(error: any): void
getAbsoluteStartTime(): number
getDeltaTime(): number
getRealTimeNanos(): number
getTime(): number
global
debugRenderSystem: DebugRender
deviceInfoSystem: DeviceInfoSystem
hapticFeedbackSystem: HapticFeedbackSystem
launchParams: GeneralDataStore
localizationSystem: LocalizationSystem
persistentStorageSystem: PersistentStorageSystem
scene: ScriptScene
textInputSystem: TextInputSystem
touchSystem: TouchDataProvider
userContextSystem: UserContextSystem
isNull(reference: any): boolean
mat2
add(mat: mat2): mat2
column0: vec2
column1: vec2
description: string
determinant(): number
div(mat: mat2): mat2
equal(mat: mat2): boolean
identity(): mat2
inverse(): mat2
mult(mat: mat2): mat2
multiplyScalar(scalar: number): mat2
sub(mat: mat2): mat2
toString(): string
transpose(): mat2
zero(): mat2
mat3
add(mat: mat3): mat3
column0: vec3
column1: vec3
column2: vec3
description: string
determinant(): number
div(mat: mat3): mat3
equal(mat: mat3): boolean
identity(): mat3
inverse(): mat3
makeFromRotation(arg1: quat): mat3
mult(mat: mat3): mat3
multiplyScalar(scalar: number): mat3
sub(mat: mat3): mat3
toString(): string
transpose(): mat3
zero(): mat3
mat4
add(mat: mat4): mat4
column0: vec4
column1: vec4
column2: vec4
column3: vec4
compMult(arg1: mat4, arg2: mat4): mat4
compose(translation: vec3, rotation: quat, scale: vec3): mat4
description: string
determinant(): number
div(mat: mat4): mat4
equal(mat: mat4): boolean
extractEulerAngles(): vec3
extractEulerXYZ(): vec3
fromColumns(column0: vec4, column1: vec4, column2: vec4, column3: vec4): mat4
fromEulerAngles(euler: vec3): mat4
fromEulerAnglesYXZ(euler: vec3): mat4
fromEulerX(xAngle: number): mat4
fromEulerY(yAngle: number): mat4
fromEulerZ(zAngle: number): mat4
fromRotation(rotation: quat): mat4
fromRows(row0: vec4, row1: vec4, row2: vec4, row3: vec4): mat4
fromScale(scale: vec3): mat4
fromTranslation(translation: vec3): mat4
fromYawPitchRoll(yawPitchRoll: vec3): mat4
identity(): mat4
inverse(): mat4
lookAt(eye: vec3, center: vec3, up: vec3): mat4
makeBasis(x: vec3, y: vec3, z: vec3): mat4
mult(mat: mat4): mat4
multiplyDirection(direction: vec3): vec3
multiplyPoint(point: vec3): vec3
multiplyScalar(scalar: number): mat4
multiplyVector(vector: vec4): vec4
orthographic(left: number, right: number, bottom: number, top: number, zNear: number, zFar: number): mat4
outerProduct(arg1: vec4, arg2: vec4): mat4
perspective(fovY: number, aspect: number, zNear: number, zFar: number): mat4
sub(mat: mat4): mat4
toString(): string
transpose(): mat4
zero(): mat4
print(message: any): void
quat
angleAxis(angle: number, axis: vec3): quat
angleBetween(a: quat, b: quat): number
dot(quat: quat): number
equal(b: quat): boolean
fromEulerAngles(x: number, y: number, z: number): quat
fromEulerVec(eulerVec: vec3): quat
fromRotationMat(rotationMat: mat3): quat
fromRotationMat4(rotationMat4: mat4): quat
getAngle(): number
getAxis(): vec3
invert(): quat
lerp(a: quat, b: quat, t: number): quat
lookAt(forward: vec3, up: vec3): quat
multiply(b: quat): quat
multiplyVec3(vec3: vec3): vec3
normalize(): void
quatFromEuler(x: number, y: number, z: number): quat
quatIdentity(): quat
rotationFromTo(from: vec3, to: vec3): quat
slerp(a: quat, b: quat, t: number): quat
toEuler(): vec3
toEulerAngles(): vec3
toString(): string
w: number
x: number
y: number
z: number
require(moduleName: string|ScriptAsset): any
requireAsset(name: string): Asset
requireType(name: string): string
script: ScriptComponent
vec2
add(vec: vec2): vec2
addInPlace(vec: vec2): void
angleTo(vec: vec2): number
clampLength(length: number): vec2
clampLengthInPlace(length: number): void
clone(): vec2
copyFrom(source: vec4|vec3|vec2): void
distance(vec: vec2): number
distanceSquared(vec: vec2): number
div(vec: vec2): vec2
divInPlace(vec: vec2): void
dot(vec: vec2): number
down(): vec2
equal(vec: vec2): boolean
fill(scalar: number): void
g: number
left(): vec2
length: number
lengthSquared: number
lerp(vecA: vec2, vecB: vec2, t: number): vec2
lerpInPlace(target: vec2, t: number): void
max(vecA: vec2, vecB: vec2): vec2
min(vecA: vec2, vecB: vec2): vec2
moveTowards(point: vec2, magnitude: number): vec2
moveTowardsInPlace(point: vec2, magnitude: number): void
mult(vec: vec2): vec2
multInPlace(vec: vec2): void
normalize(): vec2
normalizeInPlace(): void
one(): vec2
project(vec: vec2): vec2
projectInPlace(onto: vec2): void
projectOnPlane(planeNormal: vec2): vec2
projectOnPlaneInPlace(planeNormal: vec2): void
r: number
randomDirection(): vec2
randomUnitVector(): vec2
reflect(vec: vec2): vec2
reflectInPlace(planeNormal: vec2): void
right(): vec2
scale(vec: vec2): vec2
scaleInPlace(vec: vec2): void
sub(vec: vec2): vec2
subInPlace(vec: vec2): void
toString(): string
uniformScale(scale: number): vec2
uniformScaleInPlace(scale: number): void
up(): vec2
x: number
y: number
zero(): vec2
vec3
add(vec: vec3): vec3
addInPlace(vec: vec3): void
angleTo(vec: vec3): number
b: number
back(): vec3
clampLength(length: number): vec3
clampLengthInPlace(length: number): void
clone(): vec3
copyFrom(source: vec4|vec3|vec2): void
cross(vec: vec3): vec3
crossInPlace(vec: vec3): void
distance(vec: vec3): number
distanceSquared(vec: vec3): number
div(vec: vec3): vec3
divInPlace(vec: vec3): void
dot(vec: vec3): number
down(): vec3
equal(vec: vec3): boolean
fill(scalar: number): void
forward(): vec3
g: number
left(): vec3
length: number
lengthSquared: number
lerp(vecA: vec3, vecB: vec3, t: number): vec3
lerpInPlace(target: vec3, t: number): void
max(vecA: vec3, vecB: vec3): vec3
min(vecA: vec3, vecB: vec3): vec3
moveTowards(point: vec3, magnitude: number): vec3
moveTowardsInPlace(point: vec3, magnitude: number): void
mult(vec: vec3): vec3
multInPlace(vec: vec3): void
normalize(): vec3
normalizeInPlace(): void
one(): vec3
orthonormalize(vecA: vec3, vecB: vec3): void
project(vec: vec3): vec3
projectInPlace(onto: vec3): void
projectOnPlane(planeNormal: vec3): vec3
projectOnPlaneInPlace(planeNormal: vec3): void
r: number
randomDirection(): vec3
randomUnitVector(): vec3
reflect(vec: vec3): vec3
reflectInPlace(planeNormal: vec3): void
right(): vec3
rotateTowards(target: vec3, step: number): vec3
rotateTowardsInPlace(target: vec3, step: number): void
scale(vec: vec3): vec3
scaleInPlace(vec: vec3): void
setRGB(r: number, g: number, b: number): void
setRandomUnitVector(): void
setXYZ(x: number, y: number, z: number): void
slerp(vecA: vec3, vecB: vec3, t: number): vec3
slerpInPlace(target: vec3, t: number): void
sub(vec: vec3): vec3
subInPlace(vec: vec3): void
toString(): string
uniformScale(scale: number): vec3
uniformScaleInPlace(scale: number): void
up(): vec3
x: number
y: number
z: number
zero(): vec3
vec4
a: number
add(vec: vec4): vec4
addInPlace(vec: vec4): void
angleTo(vec: vec4): number
b: number
clampLength(length: number): vec4
clampLengthInPlace(length: number): void
clone(): vec4
copyFrom(source: vec4|vec3|vec2): void
distance(vec: vec4): number
distanceSquared(vec: vec4): number
div(vec: vec4): vec4
divInPlace(vec: vec4): void
dot(vec: vec4): number
equal(vec: vec4): boolean
fill(scalar: number): void
g: number
length: number
lengthSquared: number
lerp(vecA: vec4, vecB: vec4, t: number): vec4
lerpInPlace(target: vec4, t: number): void
max(vecA: vec4, vecB: vec4): vec4
min(vecA: vec4, vecB: vec4): vec4
moveTowards(point: vec4, magnitude: number): vec4
moveTowardsInPlace(point: vec4, magnitude: number): void
mult(vec: vec4): vec4
multInPlace(vec: vec4): void
normalize(): vec4
normalizeInPlace(): void
one(): vec4
project(vec: vec4): vec4
projectInPlace(onto: vec4): void
projectOnPlane(planeNormal: vec4): vec4
projectOnPlaneInPlace(planeNormal: vec4): void
r: number
reflect(vec: vec4): vec4
reflectInPlace(planeNormal: vec4): void
scale(vec: vec4): vec4
scaleInPlace(vec: vec4): void
setRGBA(r: number, g: number, b: number, a: number): void
setXYZW(x: number, y: number, z: number, w: number): void
sub(vec: vec4): vec4
subInPlace(vec: vec4): void
toString(): string
uniformScale(scale: number): vec4
uniformScaleInPlace(scale: number): void
w: number
x: number
y: number
z: number
zero(): vec4
vec4b
a: boolean
b: boolean
g: boolean
r: boolean
toString(): string
w: boolean
x: boolean
y: boolean
z: boolean