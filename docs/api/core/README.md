Warning: truncated output (original token count: 33555)
Total output lines: 6261

**Facadeur Core API**

---

# Facadeur Core API

## Classes

### CoreController

Defined in: packages/core/src/controller/project/controller.ts:67

Single source of truth for ProjectCatalog and catalog editing selection.
Design tokens, fonts, and ProjectCatalog.globalStyles live on the catalog snapshot;
node/schema preview flows go through [NodeController](#nodecontroller).

#### Implements

- [`CoreControllerHost`](#corecontrollerhost)

#### Constructors

##### Constructor

> **new CoreController**(`catalog?`): [`CoreController`](#corecontroller)

Defined in: packages/core/src/controller/project/controller.ts:74

###### Parameters

###### catalog?

`ProjectCatalog` = `...`

###### Returns

[`CoreController`](#corecontroller)

#### Properties

##### node

> `readonly` **node**: [`NodeController`](#nodecontroller)

Defined in: packages/core/src/controller/project/controller.ts:72

#### Methods

##### subscribe()

> **subscribe**(`listener`): () => `boolean`

Defined in: packages/core/src/controller/project/controller.ts:79

###### Parameters

###### listener

() => `void`

###### Returns

() => `boolean`

##### getSnapshot()

> **getSnapshot**(): [`CoreSnapshot`](#coresnapshot)

Defined in: packages/core/src/controller/project/controller.ts:84

###### Returns

[`CoreSnapshot`](#coresnapshot)

###### Implementation of

[`CoreControllerHost`](#corecontrollerhost).[`getSnapshot`](#getsnapshot-1)

##### getDefinition()

> **getDefinition**(`uuid`): \{ `kind`: `CatalogMapKey`; `definition`: `NodeDefinition`; \} \| `null`

Defined in: packages/core/src/controller/project/controller.ts:96

###### Parameters

###### uuid

`string`

###### Returns

\{ `kind`: `CatalogMapKey`; `definition`: `NodeDefinition`; \} \| `null`

##### getDefinitionDisplayName()

> **getDefinitionDisplayName**(`uuid`): `string` \| `null`

Defined in: packages/core/src/controller/project/controller.ts:101

###### Parameters

###### uuid

`string`

###### Returns

`string` \| `null`

##### getDefinitionSummaries()

> **getDefinitionSummaries**(): `object`[]

Defined in: packages/core/src/controller/project/controller.ts:106

###### Returns

`object`[]

##### getEffectiveNodeTagName()

> **getEffectiveNodeTagName**(`nodeUuid`): `string` \| `null`

Defined in: packages/core/src/controller/project/controller.ts:110

###### Parameters

###### nodeUuid

`string`

###### Returns

`string` \| `null`

##### getActiveBreakpoints()

> **getActiveBreakpoints**(): `object`[]

Defined in: packages/core/src/controller/project/controller.ts:118

###### Returns

`object`[]

##### getDesignSnapshot()

> **getDesignSnapshot**(): `object`

Defined in: packages/core/src/controller/project/controller.ts:122

###### Returns

`object`

###### tokens

> **tokens**: `Readonly`\<\{ `color`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `space`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `radius`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `shadow`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `type`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `font`: `Readonly`\<`Record`\<[`DesignTokenUuid`](#designtokenuuid), [`FontFamilyDefinition`](#fontfamilydefinition)\>\>; \}\>

###### icons?

> `optional` **icons?**: readonly [`IconDefinition`](#icondefinition)[]

###### breakpoints

> **breakpoints**: `object`[]

##### getSchemas()

> **getSchemas**(): `object`[]

Defined in: packages/core/src/controller/project/controller.ts:130

###### Returns

`object`[]

##### getSchema()

> **getSchema**(`uuid`): `Readonly`\<`Record`\<`string`, `unknown`\>\> \| `undefined`

Defined in: packages/core/src/controller/project/controller.ts:137

###### Parameters

###### uuid

`string`

###### Returns

`Readonly`\<`Record`\<`string`, `unknown`\>\> \| `undefined`

##### getDesignProps()

> **getDesignProps**(): `DesignPropDefinition`[]

Defined in: packages/core/src/controller/project/controller.ts:142

###### Returns

`DesignPropDefinition`[]

##### getTokenByUUID()

> **getTokenByUUID**(`uuid`): [`IndexedToken`](#indexedtoken) \| `undefined`

Defined in: packages/core/src/controller/project/controller.ts:146

###### Parameters

###### uuid

`string`

###### Returns

[`IndexedToken`](#indexedtoken) \| `undefined`

##### getTokenByReference()

> **getTokenByReference**(`value`): [`IndexedToken`](#indexedtoken) \| `undefined`

Defined in: packages/core/src/controller/project/controller.ts:150

###### Parameters

###### value

`unknown`

###### Returns

[`IndexedToken`](#indexedtoken) \| `undefined`

##### getTokensReferencingUUID()

> **getTokensReferencingUUID**(`uuid`): `string`[]

Defined in: packages/core/src/controller/project/controller.ts:154

###### Parameters

###### uuid

`string`

###### Returns

`string`[]

##### replaceCatalog()

> **replaceCatalog**(`catalog`): `void`

Defined in: packages/core/src/controller/project/controller.ts:158

###### Parameters

###### catalog

`unknown`

###### Returns

`void`

##### openDefinition()

> **openDefinition**(`uuid`): `void`

Defined in: packages/core/src/controller/project/controller.ts:167

###### Parameters

###### uuid

`string`

###### Returns

`void`

###### Implementation of

[`CoreControllerHost`](#corecontrollerhost).[`openDefinition`](#opendefinition-3)

##### closeDefinition()

> **closeDefinition**(): `void`

Defined in: packages/core/src/controller/project/controller.ts:177

###### Returns

`void`

###### Implementation of

[`CoreControllerHost`](#corecontrollerhost).[`closeDefinition`](#closedefinition-1)

##### applyDesignCommand()

> **applyDesignCommand**(`command`): `void`

Defined in: packages/core/src/controller/project/controller.ts:184

###### Parameters

###### command

[`CatalogDesignCommand`](#catalogdesigncommand)

###### Returns

`void`

##### createDefinition()

> **createDefinition**(`kind`, `definition`): `void`

Defined in: packages/core/src/controller/project/controller.ts:189

###### Parameters

###### kind

`CatalogMapKey`

###### definition

`NodeDefinition`

###### Returns

`void`

##### patchDefinition()

> **patchDefinition**(`kind`, `uuid`, `patch`): `void`

Defined in: packages/core/src/controller/project/controller.ts:193

###### Parameters

###### kind

`CatalogMapKey`

###### uuid

`string`

###### patch

`Partial`\<`NodeDefinition`\>

###### Returns

`void`

##### deleteDefinition()

> **deleteDefinition**(`kind`, `uuid`): `void`

Defined in: packages/core/src/controller/project/controller.ts:213

###### Parameters

###### kind

`CatalogMapKey`

###### uuid

`string`

###### Returns

`void`

##### upsertSchema()

> **upsertSchema**(`uuid`, `schema`): `void`

Defined in: packages/core/src/controller/project/controller.ts:222

###### Parameters

###### uuid

`string`

###### schema

`JsonSchemaObject`

###### Returns

`void`

##### removeSchema()

> **removeSchema**(`uuid`): `void`

Defined in: packages/core/src/controller/project/controller.ts:227

###### Parameters

###### uuid

`string`

###### Returns

`void`

##### upsertDesignProp()

> **upsertDesignProp**(`prop`): `void`

Defined in: packages/core/src/controller/project/controller.ts:231

###### Parameters

###### prop

`DesignPropDefinition`

###### Returns

`void`

##### removeDesignProp()

> **removeDesignProp**(`uuid`): `void`

Defined in: packages/core/src/controller/project/controller.ts:235

###### Parameters

###### uuid

`string`

###### Returns

`void`

##### patchNodeField()

> **patchNodeField**(`field`, `value`): `void`

Defined in: packages/core/src/controller/project/controller.ts:239

###### Parameters

###### field

`string`

###### value

`unknown`

###### Returns

`void`

###### Implementation of

[`CoreControllerHost`](#corecontrollerhost).[`patchNodeField`](#patchnodefield-1)

##### patchNodeDataRecord()

> **patchNodeDataRecord**(`nodeUuid`, `record`): `void`

Defined in: packages/core/src/controller/project/controller.ts:246

###### Parameters

###### nodeUuid

`string`

###### record

`Readonly`\<`Record`\<`string`, `unknown`\>\>

###### Returns

`void`

##### patchNodeComposition()

> **patchNodeComposition**(`nodeUuid`, `patch`): `void`

Defined in: packages/core/src/controller/project/controller.ts:251

###### Parameters

###### nodeUuid

`string`

###### patch

###### source?

`CompositionSource` \| `null`

###### indexName?

`string` \| `null`

###### keyPath?

`string` \| `null`

###### filter?

`RepeaterFilter` \| `null`

###### compositionCase?

`string` \| `null`

###### definitionRefBinding?

\{ `kind`: `"item"`; `path`: `string`; \} \| `null`

###### Returns

`void`

##### patchNodeDomAttributeRecord()

> **patchNodeDomAttributeRecord**(`nodeUuid`, `record`): `void`

Defined in: packages/core/src/controller/project/controller.ts:293

###### Parameters

###### nodeUuid

`string`

###### record

`Readonly`\<`Record`\<`string`, `string`\>\>

###### Returns

`void`

##### patchNodeDomText()

> **patchNodeDomText**(`nodeUuid`, `text`): `void`

Defined in: packages/core/src/controller/project/controller.ts:317

###### Parameters

###### nodeUuid

`string`

###### text

`string`

###### Returns

`void`

##### patchNodeClassList()

> **patchNodeClassList**(`nodeUuid`, `classes`): `void`

Defined in: packages/core/src/controller/project/controller.ts:322

###### Parameters

###### nodeUuid

`string`

###### classes

readonly `string`[]

###### Returns

`void`

##### patchNodeTagName()

> **patchNodeTagName**(`nodeUuid`, `tagName`): `void`

Defined in: packages/core/src/controller/project/controller.ts:327

###### Parameters

###### nodeUuid

`string`

###### tagName

`string`

###### Returns

`void`

##### patchNodeName()

> **patchNodeName**(`nodeUuid`, `name`): `void`

Defined in: packages/core/src/controller/project/controller.ts:332

###### Parameters

###### nodeUuid

`string`

###### name

`string`

###### Returns

`void`

##### patchDefinitionName()

> **patchDefinitionName**(`name`): `void`

Defined in: packages/core/src/controller/project/controller.ts:339

###### Parameters

###### name

`string`

###### Returns

`void`

##### patchDefinitionPreviewField()

> **patchDefinitionPreviewField**(`definitionUuid`, `field`, `value`): `void`

Defined in: packages/core/src/controller/project/controller.ts:348

###### Parameters

###### definitionUuid

`string`

###### field

`string`

###### value

[`FieldValue`](#fieldvalue) \| `undefined`

###### Returns

`void`

##### applyInspectorFormChange()

> **applyInspectorFormChange**(`target`): `void`

Defined in: packages/core/src/controller/project/controller.ts:383

###### Parameters

###### target

[`InspectorFormChangeTarget`](#inspectorformchangetarget)

###### Returns

`void`

###### Implementation of

[`CoreControllerHost`](#corecontrollerhost).[`applyInspectorFormChange`](#applyinspectorformchange-1)

##### insertCatalogNode()

> **insertCatalogNode**(`parentUuid`, `index`, `node`): `void`

Defined in: packages/core/src/controller/project/controller.ts:489

###### Parameters

###### parentUuid

`string`

###### index

`number`

###### node

[`NodeModel`](#nodemodel)

###### Returns

`void`

##### duplicateCatalogNode()

> **duplicateCatalogNode**(`sourceDefinitionUuid`, `sourceNodeUuid`, `parentUuid`, `index`): `string` \| `null`

Defined in: packages/core/src/controller/project/controller.ts:499

###### Parameters

###### sourceDefinitionUuid

`string`

###### sourceNodeUuid

`string`

###### parentUuid

`string`

###### index

`number`

###### Returns

`string` \| `null`

##### removeCatalogNode()

> **removeCatalogNode**(`nodeUuid`): `void`

Defined in: packages/core/src/controller/project/controller.ts:521

###### Parameters

###### nodeUuid

`string`

###### Returns

`void`

##### moveCatalogNode()

> **moveCatalogNode**(`nodeUuid`, `parentUuid`, `index`): `void`

Defined in: packages/core/src/controller/project/controller.ts:530

###### Parameters

###### nodeUuid

`string`

###### parentUuid

`string`

###### index

`number`

###### Returns

`void`

##### selectNode()

> **selectNode**(`uuid`): `void`

Defined in: packages/core/src/controller/project/controller.ts:540

###### Parameters

###### uuid

`string`

###### Returns

`void`

###### Implementation of

[`CoreControllerHost`](#corecontrollerhost).[`selectNode`](#selectnode-2)

##### persist()

> **persist**(`port`): `Promise`\<`void`\>

Defined in: packages/core/src/controller/project/controller.ts:546

###### Parameters

###### port

[`CatalogPort`](#catalogport)

###### Returns

`Promise`\<`void`\>

##### createDefinitionFromPort()

> **createDefinitionFromPort**(`port`, `kind`, `definition`): `Promise`\<`string` \| `undefined`\>

Defined in: packages/core/src/controller/project/controller.ts:550

###### Parameters

###### port

[`CatalogDefinitionPort`](#catalogdefinitionport)

###### kind

`CatalogMapKey`

###### definition

`Omit`\<`NodeDefinition`, `"uuid"`\> & `object`

###### Returns

`Promise`\<`string` \| `undefined`\>

##### deleteDefinitionFromPort()

> **deleteDefinitionFromPort**(`port`, `uuid`): `Promise`\<`void`\>

Defined in: packages/core/src/controller/project/controller.ts:562

###### Parameters

###### port

[`CatalogDefinitionPort`](#catalogdefinitionport)

###### uuid

`string`

###### Returns

`Promise`\<`void`\>

---

### NodeController

Defined in: packages/core/src/controller/project/node/controller.ts:8

Orchestrates preview, config, element, and schema for the open definition tree.

#### Constructors

##### Constructor

> **new NodeController**(`core`): [`NodeController`](#nodecontroller)

Defined in: packages/core/src/controller/project/node/controller.ts:14

###### Parameters

###### core

[`CoreControllerHost`](#corecontrollerhost)

###### Returns

[`NodeController`](#nodecontroller)

#### Properties

##### preview

> `readonly` **preview**: [`PreviewController`](#previewcontroller)

Defined in: packages/core/src/controller/project/node/controller.ts:9

##### element

> `readonly` **element**: `ElementController`

Defined in: packages/core/src/controller/project/node/controller.ts:10

##### config

> `readonly` **config**: `ConfigController`

Defined in: packages/core/src/controller/project/node/controller.ts:11

##### schema

> `readonly` **schema**: `SchemaController`

Defined in: packages/core/src/controller/project/node/controller.ts:12

#### Accessors

##### openDefinitionId

###### Get Signature

> **get** **openDefinitionId**(): `string` \| `null`

Defined in: packages/core/src/controller/project/node/controller.ts:21

###### Returns

`string` \| `null`

#### Methods

##### selectedNodeUuid()

> **selectedNodeUuid**(): `string` \| `null`

Defined in: packages/core/src/controller/project/node/controller.ts:25

###### Returns

`string` \| `null`

##### openDefinition()

> **openDefinition**(`uuid`): `void`

Defined in: packages/core/src/controller/project/node/controller.ts:29

###### Parameters

###### uuid

`string`

###### Returns

`void`

##### patchField()

> **patchField**(`field`, `value`): `void`

Defined in: packages/core/src/controller/project/node/controller.ts:33

###### Parameters

###### field

`string`

###### value

`unknown`

###### Returns

`void`

##### selectNode()

> **selectNode**(`uuid`): `void`

Defined in: packages/core/src/controller/project/node/controller.ts:37

###### Parameters

###### uuid

`string`

###### Returns

`void`

---

### PreviewController

Defined in: packages/core/src/controller/project/node/preview/controller.ts:18

Preview pipeline for canvas/DOM:

1. Merge field layers (ancestor → definition preview → instance data).
2. Resolve bindings (`{prop:uuid}`, field-driven attributes/styles/text) to literals.
   Output is a render tree for the Editor's React canvas.

#### Constructors

##### Constructor

> **new PreviewController**(`core`): [`PreviewController`](#previewcontroller)

Defined in: packages/core/src/controller/project/node/preview/controller.ts:19

###### Parameters

###### core

[`CoreControllerHost`](#corecontrollerhost)

###### Returns

[`PreviewController`](#previewcontroller)

#### Methods

##### fieldsForNode()

> **fieldsForNode**(`nodeUuid`): `object`

Defined in: packages/core/src/controller/project/node/preview/controller.ts:21

###### Parameters

###### nodeUuid

`string`

###### Returns

`object`

##### buildOpenDefinition()

> **buildOpenDefinition**(): [`RenderBuildConfig`](#renderbuildconfig) \| `null`

Defined in: packages/core/src/controller/project/node/preview/controller.ts:33

###### Returns

[`RenderBuildConfig`](#renderbuildconfig) \| `null`

##### inspectorForm()

> **inspectorForm**(`nodeUuid?`): [`InspectorFormModel`](#inspectorformmodel) \| `null`

Defined in: packages/core/src/controller/project/node/preview/controller.ts:41

Inspector layout, presets, and form values for the selected catalog node.

###### Parameters

###### nodeUuid?

`string`

###### Returns

[`InspectorFormModel`](#inspectorformmodel) \| `null`

##### applyFormChange()

> **applyFormChange**(`path`, `value`, `nodeUuid`): `void`

Defined in: packages/core/src/controller/project/node/preview/controller.ts:49

###### Parameters

###### path

`string`

###### value

`unknown`

###### nodeUuid

`string`

###### Returns

`void`

---

### DocumentError

Defined in: packages/core/src/document/errors.ts:1

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new DocumentError**(`code`, `message`): [`DocumentError`](#documenterror)

Defined in: packages/core/src/document/errors.ts:4

###### Parameters

###### code

`string`

###### message

`string`

###### Returns

[`DocumentError`](#documenterror)

###### Overrides

`Error.constructor`

#### Properties

##### code

> `readonly` **code**: `string`

Defined in: packages/core/src/document/errors.ts:2

##### stackTraceLimit

> `static` **stackTraceLimit**: `number`

Defined in: node\_modules/.pnpm/@types+node@22.20.4/node\_modules/@types/node/globals.d.ts:68

The `Error.stackTraceLimit` property specifies the number of stack frames
collected by a stack trace (whether generated by `new Error().stack` or
`Error.captureStackTrace(obj)`).

The default value is `10` but may be set to any valid JavaScript number. Changes
will affect any stack trace captured _after_ the value has been changed.

If set to a non-number value, or set to a negative number, stack traces will
not capture any frames.

###### Inherited from

`Error.stackTraceLimit`

##### cause?

> `optional` **cause?**: `unknown`

Defined in: node\_modules/.pnpm/typescript@5.9.3/node\_modules/typescript/lib/lib.es2022.error.d.ts:26

###### Inherited from

`Error.cause`

##### name

> **name**: `string`

Defined in: node\_modules/.pnpm/typescript@5.9.3/node\_modules/typescript/lib/lib.es5.d.ts:1076

###### Inherited from

`Error.name`

##### message

> **message**: `string`

Defined in: node\_modules/.pnpm/typescript@5.9.3/node\_modules/typescript/lib/lib.es5.d.ts:1077

###### Inherited from

`Error.message`

##### stack?

> `optional` **stack?**: `string`

Defined in: node\_modules/.pnpm/typescript@5.9.3/node\_modules/typescript/lib/lib.es5.d.ts:1078

###### Inherited from

`Error.stack`

#### Methods

##### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Defined in: node\_modules/.pnpm/@types+node@22.20.4/node\_modules/@types/node/globals.d.ts:52

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack; // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

###### Parameters

###### targetObject

`object`

###### constructorOpt?

`Function`

###### Returns

`void`

###### Inherited from

`Error.captureStackTrace`

##### prepareStackTrace()

> `static` **prepareStackTrace**(`err`, `stackTraces`): `any`

Defined in: node\_modules/.pnpm/@types+node@22.20.4/node\_modules/@types/node/globals.d.ts:56

###### Parameters

###### err

`Error`

###### stackTraces

`CallSite`[]

###### Returns

`any`

###### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

###### Inherited from

`Error.prepareStackTrace`

## Interfaces

### BehaviorRuntimeContext

Defined in: packages/core/src/controller/project/behavior-runtime.ts:3

#### Properties

##### state

> `readonly` **state**: `Readonly`\<`Record`\<`string`, [`FieldValue`](#fieldvalue) \| `null`\>\>

Defined in: packages/core/src/controller/project/behavior-runtime.ts:4

##### props?

> `readonly` `optional` **props?**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

Defined in: packages/core/src/controller/project/behavior-runtime.ts:5

##### event?

> `readonly` `optional` **event?**: `unknown`

Defined in: packages/core/src/controller/project/behavior-runtime.ts:6

##### repeaterIndices?

> `readonly` `optional` **repeaterIndices?**: `Readonly`\<`Record`\<`string`, `number`\>\>

Defined in: packages/core/src/controller/project/behavior-runtime.ts:7

---

### BehaviorRuntimeResult

Defined in: packages/core/src/controller/project/behavior-runtime.ts:10

#### Properties

##### state

> `readonly` **state**: `Readonly`\<`Record`\<`string`, [`FieldValue`](#fieldvalue) \| `null`\>\>

Defined in: packages/core/src/controller/project/behavior-runtime.ts:11

##### emitted

> `readonly` **emitted**: readonly `object`[]

Defined in: packages/core/src/controller/project/behavior-runtime.ts:12

##### matched

> `readonly` **matched**: `boolean`

Defined in: packages/core/src/controller/project/behavior-runtime.ts:13

---

### PreviewResolutionOptions

Defined in: packages/core/src/controller/project/node/preview/resolve.ts:73

#### Properties

##### behaviorStateByInstance?

> `readonly` `optional` **behaviorStateByInstance?**: `Readonly`\<`Record`\<`string`, `Readonly`\<`Record`\<`string`, [`FieldValue`](#fieldvalue) \| `null`\>\>\>\>

Defined in: packages/core/src/controller/project/node/preview/resolve.ts:74

##### includeBehaviorTargets?

> `readonly` `optional` **includeBehaviorTargets?**: `boolean`

Defined in: packages/core/src/controller/project/node/preview/resolve.ts:77

---

### IndexedToken

Defined in: packages/core/src/controller/style/tokens/types.ts:16

Shared persisted/runtime shape for every design token family. Empty group means family root.

#### Extends

- [`DesignTokenRecord`](#designtokenrecord)

#### Properties

##### family

> `readonly` **family**: [`DesignTokenFamily`](#designtokenfamily)

Defined in: packages/core/src/controller/style/tokens/types.ts:17

##### path

> `readonly` **path**: `string`

Defined in: packages/core/src/controller/style/tokens/types.ts:19

Derived display path; never used as a persisted identity or reference.

##### type

> `readonly` **type**: [`DesignTokenValueType`](#designtokenvaluetype)

Defined in: packages/core/src/controller/style/tokens/types.ts:20

##### tier?

> `readonly` `optional` **tier?**: [`TokenTier`](#tokentier)

Defined in: packages/core/src/controller/style/tokens/types.ts:21

##### breakpoints

> `readonly` **breakpoints**: `Record`\<[`DesignTokenUuid`](#designtokenuuid), [`DesignTokenValue`](#designtokenvalue)\>

Defined in: packages/core/src/controller/style/tokens/types.ts:22

###### Overrides

[`DesignTokenRecord`](#designtokenrecord).[`breakpoints`](#breakpoints-5)

##### uuid

> `readonly` **uuid**: `string`

Defined in: packages/domain/src/design-system.ts:28

###### Inherited from

[`DesignTokenRecord`](#designtokenrecord).[`uuid`](#uuid-2)

##### label

> `readonly` **label**: `string`

Defined in: packages/domain/src/design-system.ts:29

###### Inherited from

[`DesignTokenRecord`](#designtokenrecord).[`label`](#label-1)

##### group

> `readonly` **group**: `string`

Defined in: packages/domain/src/design-system.ts:30

###### Inherited from

[`DesignTokenRecord`](#designtokenrecord).[`group`](#group-2)

##### valueType

> `readonly` **valueType**: [`DesignTokenValueType`](#designtokenvaluetype)

Defined in: packages/domain/src/design-system.ts:31

###### Inherited from

[`DesignTokenRecord`](#designtokenrecord).[`valueType`](#valuetype-2)

##### value

> `readonly` **value**: [`DesignTokenValue`](#designtokenvalue)

Defined in: packages/domain/src/design-system.ts:32

###### Inherited from

[`DesignTokenRecord`](#designtokenrecord).[`value`](#value-4)

##### extensions?

> `readonly` `optional` **extensions?**: `Readonly`\<`Record`\<`string`, [`DesignTokenValue`](#designtokenvalue)\>\>

Defined in: packages/domain/src/design-system.ts:34

###### Inherited from

[`DesignTokenRecord`](#designtokenrecord).[`extensions`](#extensions-1)

---

### IndexedGroup

Defined in: packages/core/src/controller/style/tokens/types.ts:25

#### Properties

##### family

> `readonly` **family**: [`DesignTokenFamily`](#designtokenfamily)

Defined in: packages/core/src/controller/style/tokens/types.ts:26

##### group

> `readonly` **group**: `string`

Defined in: packages/core/src/controller/style/tokens/types.ts:27

##### path

> `readonly` **path**: `string`

Defined in: packages/core/src/controller/style/tokens/types.ts:28

##### tier?

> `readonly` `optional` **tier?**: [`TokenTier`](#tokentier)

Defined in: packages/core/src/controller/style/tokens/types.ts:29

---

### TokenIndex

Defined in: packages/core/src/controller/style/tokens/types.ts:32

#### Properties

##### tokens

> `readonly` **tokens**: `Map`\<`string`, [`IndexedToken`](#indexedtoken)\>

Defined in: packages/core/src/controller/style/tokens/types.ts:33

##### groups

> `readonly` **groups**: `Map`\<`string`, [`IndexedGroup`](#indexedgroup)\>

Defined in: packages/core/src/controller/style/tokens/types.ts:34

---

### NestingRule

Defined in: packages/core/src/document/kinds.ts:21

What a document of one kind may contain.
The root is the canvas for that document. Rules for `nodeTypes` apply to every
other node. Instance targets are document kinds, not node types.

#### Properties

##### rootNodeTypes

> **rootNodeTypes**: readonly (`"repeater"` \| `"switch"` \| `"slot"` \| `"text"` \| `"image"` \| `"frame"` \| `"instance"`)[]

Defined in: packages/core/src/document/kinds.ts:22

##### nodeTypes

> **nodeTypes**: readonly (`"repeater"` \| `"switch"` \| `"slot"` \| `"text"` \| `"image"` \| `"frame"` \| `"instance"`)[]

Defined in: packages/core/src/document/kinds.ts:23

##### instanceKinds

> **instanceKinds**: readonly `string`[]

Defined in: packages/core/src/document/kinds.ts:24

---

### JsonSchema

Defined in: packages/core/src/schema/contract.ts:2

JSON Schema contract used by Catalog node definitions.

#### Indexable

> \[`keyword`: `string`\]: `unknown`

#### Properties

##### $ref?

> `optional` **$ref?**: `string`

Defined in: packages/core/src/schema/contract.ts:3

##### type?

> `optional` **type?**: `string` \| `string`[]

Defined in: packages/core/src/schema/contract.ts:4

##### title?

> `optional` **title?**: `string`

Defined in: packages/core/src/schema/contract.ts:5

##### description?

> `optional` **description?**: `string`

Defined in: packages/core/src/schema/contract.ts:6

##### properties?

> `optional` **properties?**: `Record`\<`string`, [`JsonSchema`](#jsonschema)\>

Defined in: packages/core/src/schema/contract.ts:7

##### required?

> `optional` **required?**: `string`[]

Defined in: packages/core/src/schema/contract.ts:8

##### items?

> `optional` **items?**: [`JsonSchema`](#jsonschema)

Defined in: packages/core/src/schema/contract.ts:9

##### enum?

> `optional` **enum?**: `unknown`[]

Defined in: packages/core/src/schema/contract.ts:10

##### oneOf?

> `optional` **oneOf?**: [`JsonSchema`](#jsonschema)[]

Defined in: packages/core/src/schema/contract.ts:11

##### anyOf?

> `optional` **anyOf?**: [`JsonSchema`](#jsonschema)[]

Defined in: packages/core/src/schema/contract.ts:12

##### allOf?

> `optional` **allOf?**: [`JsonSchema`](#jsonschema)[]

Defined in: packages/core/src/schema/contract.ts:13

##### default?

> `optional` **default?**: `unknown`

Defined in: packages/core/src/schema/contract.ts:14

##### additionalProperties?

> `optional` **additionalProperties?**: `boolean` \| [`JsonSchema`](#jsonschema)

Defined in: packages/core/src/schema/contract.ts:15

---

### CssProperty

Defined in: packages/core/src/tokens/css-properties.ts:8

#### Properties

##### name

> **name**: `string`

Defined in: packages/core/src/tokens/css-properties.ts:9

##### value

> **value**: `string`

Defined in: packages/core/src/tokens/css-properties.ts:11

Value at the base breakpoint. Empty when the property exists only in a query.

##### breakpoints

> **breakpoints**: `Record`\<`string`, `string`\>

Defined in: packages/core/src/tokens/css-properties.ts:13

Overrides for non-base breakpoints, keyed by breakpoint id.

---

### DesignInput

Defined in: packages/core/src/tokens/resolve.ts:22

#### Properties

##### tokens?

> `optional` **tokens?**: `unknown`

Defined in: packages/core/src/tokens/resolve.ts:23

##### breakpoints?

> `optional` **breakpoints?**: readonly `object`[]

Defined in: packages/core/src/tokens/resolve.ts:24

---

### ParsedToken

Defined in: packages/core/src/tokens/resolve.ts:27

#### Properties

##### path

> **path**: `string`

Defined in: packages/core/src/tokens/resolve.ts:28

##### name

> **name**: `string`

Defined in: packages/core/src/tokens/resolve.ts:30

Custom property for a scalar token. Typography uses one name per field.

##### type

> **type**: [`DesignTokenValueType`](#designtokenvaluetype)

Defined in: packages/core/src/tokens/resolve.ts:31

##### tier?

> `optional` **tier?**: [`TokenTier`](#tokentier)

Defined in: packages/core/src/tokens/resolve.ts:32

##### value

> **value**: [`DesignTokenValue`](#designtokenvalue)

Defined in: packages/core/src/tokens/resolve.ts:34

Unresolved token value, including stable UUID references.

##### breakpoints

> **breakpoints**: `Record`\<`string`, [`DesignTokenValue`](#designtokenvalue)\>

Defined in: packages/core/src/tokens/resolve.ts:35

---

### ResolvedDesign

Defined in: packages/core/src/tokens/resolve.ts:38

#### Properties

##### tokens

> **tokens**: [`ParsedToken`](#parsedtoken)[]

Defined in: packages/core/src/tokens/resolve.ts:39

##### properties

> **properties**: [`CssProperty`](#cssproperty)[]

Defined in: packages/core/src/tokens/resolve.ts:40

##### fonts

> **fonts**: [`FontFamilyDefinition`](#fontfamilydefinition)[]

Defined in: packages/core/src/tokens/resolve.ts:41

##### breakpoints

> **breakpoints**: `object`[]

Defined in: packages/core/src/tokens/resolve.ts:46

Sorted by min-width. The first entry is the base layer and does not emit `@media`.
Its min-width is the viewport width of that frame, not a query threshold.

###### uuid

> **uuid**: `string` = `uuidSchema`

###### label

> **label**: `string`

###### minWidth

> **minWidth**: `number`

###### enabled?

> `optional` **enabled?**: `boolean`

When false, the viewport stays configured but is hidden from tabs and the stage.

---

### CatalogDefinitionPort

Defined in: packages/core/src/types/catalog-definition-port.ts:5

Catalog definition operations implemented by the host's transport adapter.

#### Methods

##### createDefinition()

> **createDefinition**(`kind`, `definition`): `Promise`\<`ProjectCatalog`\>

Defined in: packages/core/src/types/catalog-definition-port.ts:6

###### Parameters

###### kind

`CatalogMapKey`

###### definition

`Omit`\<`NodeDefinition`, `"uuid"`\> & `object`

###### Returns

`Promise`\<`ProjectCatalog`\>

##### deleteDefinition()

> **deleteDefinition**(`kind`, `uuid`): `Promise`\<`ProjectCatalog`\>

Defined in: packages/core/src/types/catalog-definition-port.ts:10

###### Parameters

###### kind

`CatalogMapKey`

###### uuid

`string`

###### Returns

`Promise`\<`ProjectCatalog`\>

---

### CoreSnapshot

Defined in: packages/core/src/types/core-contracts.ts:5

#### Properties

##### catalog

> `readonly` **catalog**: `ProjectCatalog`

Defined in: packages/core/src/types/core-contracts.ts:6

##### openDefinitionId

> `readonly` **openDefinitionId**: `string` \| `null`

Defined in: packages/core/src/types/core-contracts.ts:7

##### openDefinition

> `readonly` **openDefinition**: `NodeDefinition` \| `null`

Defined in: packages/core/src/types/core-contracts.ts:8

##### selectedNodeUuid

> `readonly` **selectedNodeUuid**: `string` \| `null`

Defined in: packages/core/src/types/core-contracts.ts:9

---

### CatalogPort

Defined in: packages/core/src/types/core-contracts.ts:13

Persistence port used by Core to save the validated catalog.

#### Methods

##### save()

> **save**(`catalog`): `Promise`\<`ProjectCatalog`\>

Defined in: packages/core/src/types/core-contracts.ts:14

###### Parameters

###### catalog

`ProjectCatalog`

###### Returns

`Promise`\<`ProjectCatalog`\>

---

### CoreControllerHost

Defined in: packages/core/src/types/host.ts:5

Sub-controllers use this surface; the concrete class is [CoreController](#corecontroller).

#### Methods

##### getSnapshot()

> **getSnapshot**(): [`CoreSnapshot`](#coresnapshot)

Defined in: packages/core/src/types/host.ts:6

###### Returns

[`CoreSnapshot`](#coresnapshot)

##### openDefinition()

> **openDefinition**(`uuid`): `void`

Defined in: packages/core/src/types/host.ts:7

###### Parameters

###### uuid

`string`

###### Returns

`void`

##### closeDefinition()

> **closeDefinition**(): `void`

Defined in: packages/core/src/types/host.ts:8

###### Returns

`void`

##### selectNode()

> **selectNode**(`uuid`): `void`

Defined in: packages/core/src/types/host.ts:9

###### Parameters

###### uuid

`string`

###### Returns

`void`

##### patchNodeField()

> **patchNodeField**(`field`, `value`): `void`

Defined in: packages/core/src/types/host.ts:10

###### Parameters

###### field

`string`

###### value

`unknown`

###### Returns

`void`

##### applyInspectorFormChange()

> **applyInspectorFormChange**(`target`): `void`

Defined in: packages/core/src/types/host.ts:11

###### Parameters

###### target

[`InspectorFormChangeTarget`](#inspectorformchangetarget)

###### Returns

`void`

---

### DesignTokenRecord

Defined in: packages/domain/src/design-system.ts:27

Shared persisted/runtime shape for every design token family. Empty group means family root.

#### Extended by

- [`FontFamilyDefinition`](#fontfamilydefinition)
- [`IndexedToken`](#indexedtoken)

#### Type Parameters

##### Value

`Value` = [`DesignTokenValue`](#designtokenvalue)

#### Properties

##### uuid

> `readonly` **uuid**: `string`

Defined in: packages/domain/src/design-system.ts:28

##### label

> `readonly` **label**: `string`

Defined in: packages/domain/src/design-system.ts:29

##### group

> `readonly` **group**: `string`

Defined in: packages/domain/src/design-system.ts:30

##### valueType

> `readonly` **valueType**: [`DesignTokenValueType`](#designtokenvaluetype)

Defined in: packages/domain/src/design-system.ts:31

##### value

> `readonly` **value**: `Value`

Defined in: packages/domain/src/design-system.ts:32

##### breakpoints?

> `readonly` `optional` **breakpoints?**: `Readonly`\<`Record`\<`string`, [`DesignTokenValue`](#designtokenvalue)\>\>

Defined in: packages/domain/src/design-system.ts:33

##### extensions?

> `readonly` `optional` **extensions?**: `Readonly`\<`Record`\<`string`, [`DesignTokenValue`](#designtokenvalue)\>\>

Defined in: packages/domain/src/design-system.ts:34

---

### FontFamilyDefinition

Defined in: packages/domain/src/design-system.ts:64

Shared persisted/runtime shape for every design token family. Empty group means family root.

#### Extends

- [`DesignTokenRecord`](#designtokenrecord)\<`FontFamilyValue`\>

#### Properties

##### uuid

> `readonly` **uuid**: `string`

Defined in: packages/domain/src/design-system.ts:28

###### Inherited from

[`DesignTokenRecord`](#designtokenrecord).[`uuid`](#uuid-2)

##### label

> `readonly` **label**: `string`

Defined in: packages/domain/src/design-system.ts:29

###### Inherited from

[`DesignTokenRecord`](#designtokenrecord).[`label`](#label-1)

##### group

> `readonly` **group**: `string`

Defined in: packages/domain/src/design-system.ts:30

###### Inherited from

[`DesignTokenRecord`](#designtokenrecord).[`group`](#group-2)

##### value

> `readonly` **value**: `FontFamilyValue`

Defined in: packages/domain/src/design-system.ts:32

###### Inherited from

[`DesignTokenRecord`](#designtokenrecord).[`value`](#value-4)

##### breakpoints?

> `readonly` `optional` **breakpoints?**: `Readonly`\<`Record`\<`string`, [`DesignTokenValue`](#designtokenvalue)\>\>

Defined in: packages/domain/src/design-system.ts:33

###### Inherited from

[`DesignTokenRecord`](#designtokenrecord).[`breakpoints`](#breakpoints-5)

##### extensions?

> `readonly` `optional` **extensions?**: `Readonly`\<`Record`\<`string`, [`DesignTokenValue`](#designtokenvalue)\>\>

Defined in: packages/domain/src/design-system.ts:34

###### Inherited from

[`DesignTokenRecord`](#designtokenrecord).[`extensions`](#extensions-1)

##### valueType

> `readonly` **valueType**: `"fontFamily"`

Defined in: packages/domain/src/design-system.ts:65

###### Overrides

[`DesignTokenRecord`](#designtokenrecord).[`valueType`](#valuetype-2)

---

### IconDefinition

Defined in: packages/domain/src/design-system.ts:68

#### Properties

##### id

> `readonly` **id**: `string`

Defined in: packages/domain/src/design-system.ts:69

##### name

> `readonly` **name**: `string`

Defined in: packages/domain/src/design-system.ts:70

##### data

> `readonly` **data**: `object`

Defined in: packages/domain/src/design-system.ts:71

###### viewBox

> `readonly` **viewBox**: `string`

###### paths

> `readonly` **paths**: readonly `string`[]

##### category?

> `readonly` `optional` **category?**: `string`

Defined in: packages/domain/src/design-system.ts:75

---

### ElementBuildConfig

Defined in: packages/domain/src/element-build.ts:6

Declarative DOM tree for renderers — no document APIs in domain.

#### Properties

##### kind?

> `readonly` `optional` **kind?**: `undefined`

Defined in: packages/domain/src/element-build.ts:7

##### tagName

> `readonly` **tagName**: `string`

Defined in: packages/domain/src/element-build.ts:8

##### text?

> `readonly` `optional` **text?**: `string`

Defined in: packages/domain/src/element-build.ts:9

##### attributes?

> `readonly` `optional` **attributes?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: packages/domain/src/element-build.ts:10

##### dataset?

> `readonly` `optional` **dataset?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: packages/domain/src/element-build.ts:11

##### dynamicStyle?

> `readonly` `optional` **dynamicStyle?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: packages/domain/src/element-build.ts:13

Resolved component prop bindings used by runtime style rules.

##### dynamicClassStyles?

> `readonly` `optional` **dynamicClassStyles?**: `Readonly`\<`Record`\<`string`, `Readonly`\<`Record`\<`string`, `string`\>\>\>\>

Defined in: packages/domain/src/element-build.ts:14

##### properties?

> `readonly` `optional` **properties?**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

Defined in: packages/domain/src/element-build.ts:15

##### children?

> `readonly` `optional` **children?**: readonly [`RenderBuildConfig`](#renderbuildconfig)[]

Defined in: packages/domain/src/element-build.ts:16

##### styleNodeUuids?

> `readonly` `optional` **styleNodeUuids?**: readonly `string`[]

Defined in: packages/domain/src/element-build.ts:18

Catalog nodes whose styles apply to this rendered root, including referenced definition roots.

##### nodeUuid?

> `readonly` `optional` **nodeUuid?**: `string`

Defined in: packages/domain/src/element-build.ts:19

##### renderKey?

> `readonly` `optional` **renderKey?**: `string`

Defined in: packages/domain/src/element-build.ts:21

Stable key for repeated instances of one authored node.

##### instanceKey?

> `readonly` `optional` **instanceKey?**: `string`

Defined in: packages/domain/src/element-build.ts:23

Stable rendered path used by editor-only behavior and control state.

##### behaviorTargets?

> `readonly` `optional` **behaviorTargets?**: readonly `ElementBehaviorTarget`[]

Defined in: packages/domain/src/element-build.ts:25

Component behavior targets attached to this rendered element.

---

### FragmentBuildConfig

Defined in: packages/domain/src/element-build.ts:39

A structural Catalog node that contributes its children without a DOM element.

#### Properties

##### kind

> `readonly` **kind**: `"fragment"`

Defined in: packages/domain/src/element-build.ts:40

##### tagName?

> `readonly` `optional` **tagName?**: `undefined`

Defined in: packages/domain/src/element-build.ts:41

##### text?

> `readonly` `optional` **text?**: `undefined`

Defined in: packages/domain/src/element-build.ts:42

##### attributes?

> `readonly` `optional` **attributes?**: `undefined`

Defined in: packages/domain/src/element-build.ts:43

##### children?

> `readonly` `optional` **children?**: readonly [`RenderBuildConfig`](#renderbuildconfig)[]

Defined in: packages/domain/src/element-build.ts:44

##### nodeUuid?

> `readonly` `optional` **nodeUuid?**: `string`

Defined in: packages/domain/src/element-build.ts:45

##### renderKey?

> `readonly` `optional` **renderKey?**: `string`

Defined in: packages/domain/src/element-build.ts:47

Stable key for repeated instances of one authored node.

##### repeater?

> `readonly` `optional` **repeater?**: `object`

Defined in: packages/domain/src/element-build.ts:49

Runtime array mapping for a dynamic repeater, including empty-list templates.

###### source

> `readonly` **source**: `CompositionSource`

###### itemSchema

> `readonly` **itemSchema**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

###### templates

> `readonly` **templates**: readonly [`RenderBuildConfig`](#renderbuildconfig)[]

###### indexName

> `readonly` **indexName**: `string`

###### keyPath?

> `readonly` `optional` **keyPath?**: `string`

###### filter?

> `readonly` `optional` **filter?**: `RepeaterFilter`

---

### NodeModel

Defined in: packages/domain/src/node.ts:111

#### Properties

##### uuid

> `readonly` **uuid**: `string`

Defined in: packages/domain/src/node.ts:112

##### name?

> `readonly` `optional` **name?**: `string`

Defined in: packages/domain/src/node.ts:114

Editor-facing label for this authored element, independent of its HTML tag.

##### dom

> `readonly` **dom**: `DomSpec` & `object`

Defined in: packages/domain/src/node.ts:115

###### Type Declaration

###### children?

> `readonly` `optional` **children?**: readonly [`NodeModel`](#nodemodel)[]

##### classes?

> `readonly` `optional` **classes?**: readonly `NodeClassDefinition`[]

Defined in: packages/domain/src/node.ts:117

Literal CSS classes owned by this element; the `class` DOM attribute is derived.

##### schema?

> `readonly` `optional` **schema?**: `SchemaSource`

Defined in: packages/domain/src/node.ts:118

##### data?

> `readonly` `optional` **data?**: `Readonly`\<`Record`\<`string`, [`FieldValue`](#fieldvalue)\>\>

Defined in: packages/domain/src/node.ts:119

##### config?

> `readonly` `optional` **config?**: `NodeConfig`

Defined in: packages/domain/src/node.ts:120

## Type Aliases

### CatalogDesignCommand

> **CatalogDesignCommand** = `GlobalTokenCommand` \| `DesignLibraryCommand` \| `NodeClassStyleCommand` \| `NodeClassStyleDeclarationsCommand` \| `NodeClassConditionCommand` \| `NodeClassOrderCommand`

Defined in: packages/core/src/controller/project/design-commands.ts:20

---

### InspectorFormChangeTarget

> **InspectorFormChangeTarget** = \{ `kind`: `"definitionName"`; `value`: `string`; \} \| \{ `kind`: `"definitionStaticField"`; `field`: `string`; `setting`: `"isStatic"` \| `"value"` \| `"expose"`; `value`: `boolean` \| [`FieldValue`](#fieldvalue); \} \| \{ `kind`: `"definitionInstanceField"`; `instanceUuid`: `string`; `field`: `string`; `setting`: `"isStatic"` \| `"value"` \| `"expose"`; `value`: `boolean` \| [`FieldValue`](#fieldvalue); \} \| \{ `kind`: `"nodeTagName"`; `nodeUuid`: `string`; `value`: `string`; \} \| \{ `kind`: `"nodeText"`; `nodeUuid`: `string`; `value`: `string`; \} \| \{ `kind`: `"nodeClassList"`; `nodeUuid`: `string`; `value`: readonly `string`[]; \} \| \{ `kind`: `"nodeDataRecord"`; `nodeUuid`: `string`; `value`: `Readonly`\<`Record`\<`string`, `string`\>\>; \} \| \{ `kind`: `"nodeComposition"`; `nodeUuid`: `string`; `patch`: \{ `source?`: `CompositionSource` \| `null`; `indexName?`: `string` \| `null`; `keyPath?`: `string` \| `null`; `filter?`: `RepeaterFilter` \| `null`; `compositionCase?`: `string` \| `null`; `definitionRefBinding?`: `NodeConfig`\[`"definitionRefBinding"`\] \| `null`; \}; \} \| \{ `kind`: `"nodeFieldExposureMode"`; `nodeUuid`: `string`; `mode`: `"flat"` \| `"grouped"` \| `"manual"`; \} \| \{ `kind`: `"nodeFieldExposureGroupName"`; `nodeUuid`: `string`; `value`: `string`; \} \| \{ `kind`: `"nodeFieldExposureFields"`; `nodeUuid`: `string`; `value`: `Readonly`\<`Record`\<`string`, `string`\>\>; \} \| \{ `kind`: `"previewField"`; `definitionUuid`: `string`; `field`: `string`; `value`: [`FieldValue`](#fieldvalue) \| `undefined`; \} \| \{ `kind`: `"nodeSchemaField"`; `nodeUuid`: `string`; `field`: `string`; `value`: [`FieldValue`](#fieldvalue) \| `undefined`; \}

Defined in: packages/core/src/controller/project/inspector-form-change.ts:3

---

### InspectorInputs

> **InspectorInputs** = `object`

Defined in: packages/core/src/controller/project/node/config/inspector.ts:7

#### Properties

##### fields

> **fields**: readonly [`JsonSchemaField`](#jsonschemafield)[]

Defined in: packages/core/src/controller/project/node/config/inspector.ts:8

##### values

> **values**: `Record`\<`string`, [`FieldValue`](#fieldvalue)\>

Defined in: packages/core/src/controller/project/node/config/inspector.ts:9

---

### InspectorFormValue

> **InspectorFormValue** = `object`

Defined in: packages/core/src/controller/project/node/preview/inspector-view.ts:38

#### Properties

##### definition

> **definition**: `object`

Defined in: packages/core/src/controller/project/node/preview/inspector-view.ts:39

###### name

> **name**: `string`

##### node

> **node**: `object`

Defined in: packages/core/src/controller/project/node/preview/inspector-view.ts:42

###### name

> **name**: `string`

###### tagName?

> `optional` **tagName?**: `string`

###### text

> **text**: `string`

###### classList

> **classList**: `string`[]

###### data

> **data**: `Record`\<`string`, `string`\>

###### compositionSource

> **compositionSource**: `string`

###### compositionIndexName

> **compositionIndexName**: `string`

###### compositionKeyPath

> **compositionKeyPath**: `string`

###### compositionFilter

> **compositionFilter**: `string`

###### compositionCase

> **compositionCase**: `string`

###### definitionRefBindingPath

> **definitionRefBindingPath**: `string`

##### previewData

> **previewData**: `Record`\<`string`, [`FieldValue`](#fieldvalue)\>

Defined in: packages/core/src/controller/project/node/preview/inspector-view.ts:55

##### nodeData

> **nodeData**: `Record`\<`string`, [`FieldValue`](#fieldvalue)\>

Defined in: packages/core/src/controller/project/node/preview/inspector-view.ts:56

---

### InspectorFormField

> **InspectorFormField** = \{ `type`: `"section"`; `title`: `string`; `fields`: [`InspectorFormField`](#inspectorformfield)[]; \} \| \{ `type`: `"text"`; `path`: `string`; `label`: `string`; `hint?`: `string`; `bindable?`: `boolean`; \} \| \{ `type`: `"select"`; `path`: `string`; `label`: `string`; `options`: readonly `object`[]; \} \| \{ `type`: `"classList"`; `path`: `string`; `label`: `string`; `suggestions`: readonly `string`[]; \} \| \{ `type`: `"record"`; `path`: `string`; `label`: `string`; `keyLabel?`: `string`; `valueLabel?`: `string`; `propBindValues?`: `boolean`; \} \| \{ `type`: `"schemaField"`; `path`: `string`; `field`: [`JsonSchemaField`](#jsonschemafield); `label`: `string`; `propBindable?`: `boolean`; \}

Defined in: packages/core/src/controller/project/node/preview/inspector-view.ts:59

---

### InspectorFormModel

> **InspectorFormModel** = `object`

Defined in: packages/core/src/controller/project/node/preview/inspector-view.ts:85

#### Properties

##### nodeUuid

> **nodeUuid**: `string`

Defined in: packages/core/src/controller/project/node/preview/inspector-view.ts:86

##### formValue

> **formValue**: [`InspectorFormValue`](#inspectorformvalue)

Defined in: packages/core/src/controller/project/node/preview/inspector-view.ts:87

##### fields

> **fields**: [`InspectorFormField`](#inspectorformfield)[]

Defined in: packages/core/src/controller/project/node/preview/inspector-view.ts:88

##### configFields

> **configFields**: readonly `object`[]

Defined in: packages/core/src/controller/project/node/preview/inspector-view.ts:89

##### propOptions

> **propOptions**: readonly [`DesignPropOption`](#designpropoption)[]

Defined in: packages/core/src/controller/project/node/preview/inspector-view.ts:96

---

### DesignPropOption

> **DesignPropOption** = `object`

Defined in: packages/core/src/controller/project/node/preview/prop-ref.ts:8

#### Propertie…8555 tokens truncated…stFromNode()

> **classListFromNode**(`node`): `string`[]

Defined in: packages/core/src/controller/project/catalog/node-classes.ts:18

#### Parameters

##### node

[`NodeModel`](#nodemodel)

#### Returns

`string`[]

---

### patchNodeClasses()

> **patchNodeClasses**(`catalog`, `definitionUuid`, `nodeUuid`, `names`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/node-classes.ts:53

#### Parameters

##### catalog

`ProjectCatalog`

##### definitionUuid

`string`

##### nodeUuid

`string`

##### names

readonly `string`[]

#### Returns

`ProjectCatalog`

---

### setNodeClassStyleDeclaration()

> **setNodeClassStyleDeclaration**(`catalog`, `input`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/node-classes.ts:71

#### Parameters

##### catalog

`ProjectCatalog`

##### input

###### definitionUuid

`string`

###### nodeUuid

`string`

###### className

`string`

###### property

`string`

###### value

`string` \| `null`

###### breakpointUuid

`string` \| `null`

#### Returns

`ProjectCatalog`

---

### setNodeClassStyleDeclarations()

> **setNodeClassStyleDeclarations**(`catalog`, `input`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/node-classes.ts:131

#### Parameters

##### catalog

`ProjectCatalog`

##### input

###### definitionUuid

`string`

###### nodeUuid

`string`

###### className

`string`

###### declarations

`Readonly`\<`Record`\<`string`, `string` \| `null`\>\>

###### breakpointUuid

`string` \| `null`

#### Returns

`ProjectCatalog`

---

### findDefinition()

> **findDefinition**(`catalog`, `uuid`): \{ `kind`: `CatalogMapKey`; `definition`: `NodeDefinition`; \} \| `null`

Defined in: packages/core/src/controller/project/catalog/ops.ts:23

#### Parameters

##### catalog

`ProjectCatalog`

##### uuid

`string`

#### Returns

\{ `kind`: `CatalogMapKey`; `definition`: `NodeDefinition`; \} \| `null`

---

### listCatalogDefinitions()

> **listCatalogDefinitions**(`catalog`): `object`[]

Defined in: packages/core/src/controller/project/catalog/ops.ts:34

#### Parameters

##### catalog

`ProjectCatalog`

#### Returns

`object`[]

---

### findNodeByUuid()

> **findNodeByUuid**(`root`, `uuid`): [`NodeModel`](#nodemodel) \| `null`

Defined in: packages/core/src/controller/project/catalog/ops.ts:47

#### Parameters

##### root

[`NodeModel`](#nodemodel)

##### uuid

`string`

#### Returns

[`NodeModel`](#nodemodel) \| `null`

---

### patchNodeData()

> **patchNodeData**(`catalog`, `definitionUuid`, `nodeUuid`, `field`, `value`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/ops.ts:81

#### Parameters

##### catalog

`ProjectCatalog`

##### definitionUuid

`string`

##### nodeUuid

`string`

##### field

`string`

##### value

`unknown`

#### Returns

`ProjectCatalog`

---

### patchNodeDataRecord()

> **patchNodeDataRecord**(`catalog`, `definitionUuid`, `nodeUuid`, `record`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/ops.ts:205

#### Parameters

##### catalog

`ProjectCatalog`

##### definitionUuid

`string`

##### nodeUuid

`string`

##### record

`Readonly`\<`Record`\<`string`, `unknown`\>\>

#### Returns

`ProjectCatalog`

---

### patchNodeDomAttributes()

> **patchNodeDomAttributes**(`catalog`, `definitionUuid`, `nodeUuid`, `attributes`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/ops.ts:277

#### Parameters

##### catalog

`ProjectCatalog`

##### definitionUuid

`string`

##### nodeUuid

`string`

##### attributes

`Readonly`\<`Record`\<`string`, `string`\>\>

#### Returns

`ProjectCatalog`

---

### patchNodeTagName()

> **patchNodeTagName**(`catalog`, `definitionUuid`, `nodeUuid`, `tagName`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/ops.ts:308

#### Parameters

##### catalog

`ProjectCatalog`

##### definitionUuid

`string`

##### nodeUuid

`string`

##### tagName

`string`

#### Returns

`ProjectCatalog`

---

### patchNodeName()

> **patchNodeName**(`catalog`, `definitionUuid`, `nodeUuid`, `name`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/ops.ts:327

#### Parameters

##### catalog

`ProjectCatalog`

##### definitionUuid

`string`

##### nodeUuid

`string`

##### name

`string`

#### Returns

`ProjectCatalog`

---

### resolveJsonSchemaForDefinition()

> **resolveJsonSchemaForDefinition**(`catalog`, `definition`): `Readonly`\<`Record`\<`string`, `unknown`\>\> \| `null`

Defined in: packages/core/src/controller/project/catalog/ops.ts:447

#### Parameters

##### catalog

`ProjectCatalog`

##### definition

`NodeDefinition`

#### Returns

`Readonly`\<`Record`\<`string`, `unknown`\>\> \| `null`

---

### upsertCatalogDesignProp()

> **upsertCatalogDesignProp**(`catalog`, `prop`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/props-ops.ts:3

#### Parameters

##### catalog

`ProjectCatalog`

##### prop

`DesignPropDefinition`

#### Returns

`ProjectCatalog`

---

### removeCatalogDesignProp()

> **removeCatalogDesignProp**(`catalog`, `uuid`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/props-ops.ts:13

#### Parameters

##### catalog

`ProjectCatalog`

##### uuid

`string`

#### Returns

`ProjectCatalog`

---

### definitionDisplayName()

> **definitionDisplayName**(`catalog`, `definition`): `string`

Defined in: packages/core/src/controller/project/catalog/queries.ts:7

Resolve a definition's user-facing name from its name, schema title, or kind.

#### Parameters

##### catalog

`ProjectCatalog`

##### definition

`NodeDefinition`

#### Returns

`string`

---

### effectiveNodeTagName()

> **effectiveNodeTagName**(`catalog`, `node`): `string` \| `undefined`

Defined in: packages/core/src/controller/project/catalog/queries.ts:21

Resolve the rendered HTML tag through nested component definitions.

#### Parameters

##### catalog

`ProjectCatalog`

##### node

[`NodeModel`](#nodemodel)

#### Returns

`string` \| `undefined`

---

### definitionSummaries()

> **definitionSummaries**(`catalog`): `object`[]

Defined in: packages/core/src/controller/project/catalog/queries.ts:34

Return all catalog definitions as name-sorted summary records.

#### Parameters

##### catalog

`ProjectCatalog`

#### Returns

`object`[]

---

### defaultChildrenSlotCount()

> **defaultChildrenSlotCount**(`definition`): `number`

Defined in: packages/core/src/controller/project/catalog/tree-ops.ts:6

#### Parameters

##### definition

`NodeDefinition`

#### Returns

`number`

---

### canAcceptCatalogChildren()

> **canAcceptCatalogChildren**(`node`, `catalog?`): `boolean`

Defined in: packages/core/src/controller/project/catalog/tree-ops.ts:16

#### Parameters

##### node

[`NodeModel`](#nodemodel)

##### catalog?

`ProjectCatalog`

#### Returns

`boolean`

---

### findParentOfNode()

> **findParentOfNode**(`root`, `uuid`): \{ `parent`: [`NodeModel`](#nodemodel); `index`: `number`; \} \| `null`

Defined in: packages/core/src/controller/project/catalog/tree-ops.ts:34

#### Parameters

##### root

[`NodeModel`](#nodemodel)

##### uuid

`string`

#### Returns

\{ `parent`: [`NodeModel`](#nodemodel); `index`: `number`; \} \| `null`

---

### insertCatalogNode()

> **insertCatalogNode**(`catalog`, `definitionUuid`, `parentUuid`, `index`, `node`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/tree-ops.ts:44

#### Parameters

##### catalog

`ProjectCatalog`

##### definitionUuid

`string`

##### parentUuid

`string`

##### index

`number`

##### node

[`NodeModel`](#nodemodel)

#### Returns

`ProjectCatalog`

---

### isInsideCatalogSubtree()

> **isInsideCatalogSubtree**(`root`, `ancestorUuid`, `nodeUuid`): `boolean`

Defined in: packages/core/src/controller/project/catalog/tree-ops.ts:123

#### Parameters

##### root

[`NodeModel`](#nodemodel)

##### ancestorUuid

`string`

##### nodeUuid

`string`

#### Returns

`boolean`

---

### moveCatalogNode()

> **moveCatalogNode**(`catalog`, `definitionUuid`, `nodeUuid`, `newParentUuid`, `index`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/tree-ops.ts:152

#### Parameters

##### catalog

`ProjectCatalog`

##### definitionUuid

`string`

##### nodeUuid

`string`

##### newParentUuid

`string`

##### index

`number`

#### Returns

`ProjectCatalog`

---

### removeCatalogNode()

> **removeCatalogNode**(`catalog`, `definitionUuid`, `nodeUuid`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/tree-ops.ts:180

#### Parameters

##### catalog

`ProjectCatalog`

##### definitionUuid

`string`

##### nodeUuid

`string`

#### Returns

`ProjectCatalog`

---

### validateProjectCatalog()

> **validateProjectCatalog**(`data`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/validate.ts:30

#### Parameters

##### data

`unknown`

#### Returns

`ProjectCatalog`

---

### assertCatalogRefIntegrity()

> **assertCatalogRefIntegrity**(`catalog`): `void`

Defined in: packages/core/src/controller/project/catalog/validate.ts:464

Ensure schema refs and definitionRef targets exist in the catalog.

#### Parameters

##### catalog

`ProjectCatalog`

#### Returns

`void`

---

### emptyProjectCatalog()

> **emptyProjectCatalog**(): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/validate.ts:641

#### Returns

`ProjectCatalog`

---

### applyCatalogDesignCommand()

> **applyCatalogDesignCommand**(`catalog`, `command`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/design-commands.ts:28

#### Parameters

##### catalog

`ProjectCatalog`

##### command

[`CatalogDesignCommand`](#catalogdesigncommand)

#### Returns

`ProjectCatalog`

---

### inspectorInputsForNode()

> **inspectorInputsForNode**(`catalog`, `definition`, `nodeUuid`, `instanceData?`): [`InspectorInputs`](#inspectorinputs)

Defined in: packages/core/src/controller/project/node/config/inspector.ts:13

Schema-backed inspector rows for a node: field defs + merged preview/instance values.

#### Parameters

##### catalog

`ProjectCatalog`

##### definition

`NodeDefinition`

##### nodeUuid

`string`

##### instanceData?

`Readonly`\<`Record`\<`string`, [`FieldValue`](#fieldvalue)\>\>

#### Returns

[`InspectorInputs`](#inspectorinputs)

---

### evaluateClassCondition()

> **evaluateClassCondition**(`condition`, `context`): `boolean`

Defined in: packages/core/src/controller/project/node/preview/class-conditions.ts:23

#### Parameters

##### condition

`ClassCondition` \| `LegacyClassCondition`

##### context

[`ReferenceResolutionContext`](#referenceresolutioncontext)

#### Returns

`boolean`

---

### effectiveClassList()

> **effectiveClassList**(`node`, `context`): `string`[]

Defined in: packages/core/src/controller/project/node/preview/class-conditions.ts:39

#### Parameters

##### node

[`NodeModel`](#nodemodel)

##### context

[`ReferenceResolutionContext`](#referenceresolutioncontext)

#### Returns

`string`[]

---

### classConditionOperatorsForType()

> **classConditionOperatorsForType**(`type`): `string`[]

Defined in: packages/core/src/controller/project/node/preview/class-conditions.ts:45

#### Parameters

##### type

`string` \| `undefined`

#### Returns

`string`[]

---

### buildInspectorFormModel()

> **buildInspectorFormModel**(`catalog`, `definition`, `nodeUuid`): [`InspectorFormModel`](#inspectorformmodel) \| `null`

Defined in: packages/core/src/controller/project/node/preview/inspector-view.ts:146

Declarative inspector layout + values for the open definition and selected node.

#### Parameters

##### catalog

`ProjectCatalog`

##### definition

`NodeDefinition`

##### nodeUuid

`string`

#### Returns

[`InspectorFormModel`](#inspectorformmodel) \| `null`

---

### inspectorChangeTarget()

> **inspectorChangeTarget**(`path`, `value`, `nodeUuid`, `previewDefinitionUuid?`): [`InspectorFormChangeTarget`](#inspectorformchangetarget) \| `null`

Defined in: packages/core/src/controller/project/node/preview/inspector-view.ts:443

Map a form path + value to a typed catalog mutation target.

#### Parameters

##### path

`string`

##### value

`unknown`

##### nodeUuid

`string`

##### previewDefinitionUuid?

`string` = `nodeUuid`

#### Returns

[`InspectorFormChangeTarget`](#inspectorformchangetarget) \| `null`

---

### mergePreviewFields()

> **mergePreviewFields**(`definitionPreview`, `nodeData`, `parentFields`, `schema?`): `object`

Defined in: packages/core/src/controller/project/node/preview/merge.ts:9

Merge preview defaults, inherited values, then node-level values.

#### Parameters

##### definitionPreview

`Record`\<`string`, [`FieldValue`](#fieldvalue)\> \| `undefined`

##### nodeData

`Record`\<`string`, [`FieldValue`](#fieldvalue)\> \| `undefined`

##### parentFields

`Record`\<`string`, [`FieldValue`](#fieldvalue)\>

##### schema?

`Readonly`\<`Record`\<`string`, `unknown`\>\> \| `null`

#### Returns

`object`

---

### previewFieldsForNode()

> **previewFieldsForNode**(`definition`, `nodeUuid`, `ancestorFields?`, `schema?`): `object`

Defined in: packages/core/src/controller/project/node/preview/merge.ts:41

#### Parameters

##### definition

`NodeDefinition`

##### nodeUuid

`string`

##### ancestorFields?

`Record`\<`string`, [`FieldValue`](#fieldvalue)\> = `{}`

##### schema?

`Readonly`\<`Record`\<`string`, `unknown`\>\> \| `null`

#### Returns

`object`

---

### encodePropRef()

> **encodePropRef**(`uuid`): `string`

Defined in: packages/core/src/controller/project/node/preview/prop-ref.ts:17

#### Parameters

##### uuid

`string`

#### Returns

`string`

---

### parsePropRef()

> **parsePropRef**(`value`): `string` \| `null`

Defined in: packages/core/src/controller/project/node/preview/prop-ref.ts:25

#### Parameters

##### value

[`FieldValue`](#fieldvalue) \| `undefined`

#### Returns

`string` \| `null`

---

### isPropRef()

> **isPropRef**(`value`): `boolean`

Defined in: packages/core/src/controller/project/node/preview/prop-ref.ts:35

#### Parameters

##### value

[`FieldValue`](#fieldvalue) \| `undefined`

#### Returns

`boolean`

---

### designPropOptions()

> **designPropOptions**(`catalog`, `componentSchema?`, `repeaterScopes?`): [`DesignPropOption`](#designpropoption)[]

Defined in: packages/core/src/controller/project/node/preview/prop-ref.ts:39

#### Parameters

##### catalog

`ProjectCatalog`

##### componentSchema?

`Readonly`\<`Record`\<`string`, `unknown`\>\> \| `null`

##### repeaterScopes?

readonly [`RepeaterReferenceScope`](#repeaterreferencescope)[] = `[]`

#### Returns

[`DesignPropOption`](#designpropoption)[]

---

### computedIndexName()

> **computedIndexName**(`depth`): `string`

Defined in: packages/core/src/controller/project/node/preview/reference-resolver.ts:31

#### Parameters

##### depth

`number`

#### Returns

`string`

---

### resolveReferenceValue()

> **resolveReferenceValue**(`reference`, `context`): `unknown`

Defined in: packages/core/src/controller/project/node/preview/reference-resolver.ts:36

Resolve legacy and scoped reference encodings against one explicit context.

#### Parameters

##### reference

`string`

##### context

[`ReferenceResolutionContext`](#referenceresolutioncontext)

#### Returns

`unknown`

---

### resolveReferenceText()

> **resolveReferenceText**(`reference`, `context`): `string`

Defined in: packages/core/src/controller/project/node/preview/reference-resolver.ts:126

#### Parameters

##### reference

`string`

##### context

[`ReferenceResolutionContext`](#referenceresolutioncontext)

#### Returns

`string`

---

### resolveDefinitionToElementBuildConfig()

> **resolveDefinitionToElementBuildConfig**(`definition`, `catalog`, `parentFields?`, `options?`): [`RenderBuildConfig`](#renderbuildconfig)

Defined in: packages/core/src/controller/project/node/preview/resolve.ts:133

Walk a definition tree: merge field layers, resolve bindings, and expand Catalog composition.
Keep this independent of the renderer so preview and code generation share the resolved tree.

#### Parameters

##### definition

`NodeDefinition`

##### catalog

`ProjectCatalog`

##### parentFields?

`Record`\<`string`, [`FieldValue`](#fieldvalue)\> = `{}`

##### options?

[`PreviewResolutionOptions`](#previewresolutionoptions) = `{}`

#### Returns

[`RenderBuildConfig`](#renderbuildconfig)

---

### omitVariantAxis()

> **omitVariantAxis**(`style`, `axis`): \{ `declarations?`: \{\[`key`: `string`\]: `string`; \}; `states?`: \{ `hover?`: \{\[`key`: `string`\]: `string`; \}; `focus-visible?`: \{\[`key`: `string`\]: `string`; \}; `disabled?`: \{\[`key`: `string`\]: `string`; \}; \}; `variants?`: \{\[`key`: `string`\]: `object`; \}; `breakpoints?`: \{\[`key`: `string`\]: `object`; \}; `rules?`: `object`[]; \} \| `undefined`

Defined in: packages/core/src/controller/style/blocks/edit.ts:5

Drop one variant axis from the style block.

#### Parameters

##### style

###### declarations?

\{\[`key`: `string`\]: `string`; \} = `...`

###### states?

\{ `hover?`: \{\[`key`: `string`\]: `string`; \}; `focus-visible?`: \{\[`key`: `string`\]: `string`; \}; `disabled?`: \{\[`key`: `string`\]: `string`; \}; \} = `...`

###### states.hover?

\{\[`key`: `string`\]: `string`; \} = `...`

###### states.focus-visible?

\{\[`key`: `string`\]: `string`; \} = `...`

###### states.disabled?

\{\[`key`: `string`\]: `string`; \} = `...`

###### variants?

\{\[`key`: `string`\]: `object`; \} = `...`

###### breakpoints?

\{\[`key`: `string`\]: `object`; \} = `...`

###### rules?

`object`[] = `...`

Ordered base rules; named preset rule arrays sparsely merge by id and append new rules.

##### axis

`string`

#### Returns

##### Type Literal

\{ `declarations?`: \{\[`key`: `string`\]: `string`; \}; `states?`: \{ `hover?`: \{\[`key`: `string`\]: `string`; \}; `focus-visible?`: \{\[`key`: `string`\]: `string`; \}; `disabled?`: \{\[`key`: `string`\]: `string`; \}; \}; `variants?`: \{\[`key`: `string`\]: `object`; \}; `breakpoints?`: \{\[`key`: `string`\]: `object`; \}; `rules?`: `object`[]; \}

###### declarations?

> `optional` **declarations?**: `object`

###### Index Signature

\[`key`: `string`\]: `string`

###### states?

> `optional` **states?**: `object`

###### states.hover?

> `optional` **hover?**: `object`

###### Index Signature

\[`key`: `string`\]: `string`

###### states.focus-visible?

> `optional` **focus-visible?**: `object`

###### Index Signature

\[`key`: `string`\]: `string`

###### states.disabled?

> `optional` **disabled?**: `object`

###### Index Signature

\[`key`: `string`\]: `string`

###### variants?

> `optional` **variants?**: `object`

###### Index Signature

\[`key`: `string`\]: `object`

###### breakpoints?

> `optional` **breakpoints?**: `object`

###### Index Signature

\[`key`: `string`\]: `object`

###### rules?

> `optional` **rules?**: `object`[]

Ordered base rules; named preset rule arrays sparsely merge by id and append new rules.

---

`undefined`

---

### omitVariantValues()

> **omitVariantValues**(`style`, `axis`, `keep`): \{ `declarations?`: \{\[`key`: `string`\]: `string`; \}; `states?`: \{ `hover?`: \{\[`key`: `string`\]: `string`; \}; `focus-visible?`: \{\[`key`: `string`\]: `string`; \}; `disabled?`: \{\[`key`: `string`\]: `string`; \}; \}; `variants?`: \{\[`key`: `string`\]: `object`; \}; `breakpoints?`: \{\[`key`: `string`\]: `object`; \}; `rules?`: `object`[]; \} \| `undefined`

Defined in: packages/core/src/controller/style/blocks/edit.ts:10

Drop variant values that are no longer on the axis. `keep` contains values that remain.

#### Parameters

##### style

###### declarations?

\{\[`key`: `string`\]: `string`; \} = `...`

###### states?

\{ `hover?`: \{\[`key`: `string`\]: `string`; \}; `focus-visible?`: \{\[`key`: `string`\]: `string`; \}; `disabled?`: \{\[`key`: `string`\]: `string`; \}; \} = `...`

###### states.hover?

\{\[`key`: `string`\]: `string`; \} = `...`

###### states.focus-visible?

\{\[`key`: `string`\]: `string`; \} = `...`

###### states.disabled?

\{\[`key`: `string`\]: `string`; \} = `...`

###### variants?

\{\[`key`: `string`\]: `object`; \} = `...`

###### breakpoints?

\{\[`key`: `string`\]: `object`; \} = `...`

###### rules?

`object`[] = `...`

Ordered base rules; named preset rule arrays sparsely merge by id and append new rules.

##### axis

`string`

##### keep

`ReadonlySet`\<`string`\>

#### Returns

##### Type Literal

\{ `declarations?`: \{\[`key`: `string`\]: `string`; \}; `states?`: \{ `hover?`: \{\[`key`: `string`\]: `string`; \}; `focus-visible?`: \{\[`key`: `string`\]: `string`; \}; `disabled?`: \{\[`key`: `string`\]: `string`; \}; \}; `variants?`: \{\[`key`: `string`\]: `object`; \}; `breakpoints?`: \{\[`key`: `string`\]: `object`; \}; `rules?`: `object`[]; \}

###### declarations?

> `optional` **declarations?**: `object`

###### Index Signature

\[`key`: `string`\]: `string`

###### states?

> `optional` **states?**: `object`

###### states.hover?

> `optional` **hover?**: `object`

###### Index Signature

\[`key`: `string`\]: `string`

###### states.focus-visible?

> `optional` **focus-visible?**: `object`

###### Index Signature

\[`key`: `string`\]: `string`

###### states.disabled?

> `optional` **disabled?**: `object`

###### Index Signature

\[`key`: `string`\]: `string`

###### variants?

> `optional` **variants?**: `object`

###### Index Signature

\[`key`: `string`\]: `object`

###### breakpoints?

> `optional` **breakpoints?**: `object`

###### Index Signature

\[`key`: `string`\]: `object`

###### rules?

> `optional` **rules?**: `object`[]

Ordered base rules; named preset rule arrays sparsely merge by id and append new rules.

---

`undefined`

---

### canonicalizeStyleBlock()

> **canonicalizeStyleBlock**(`style`): \{ `declarations?`: \{\[`key`: `string`\]: `string`; \}; `states?`: \{ `hover?`: \{\[`key`: `string`\]: `string`; \}; `focus-visible?`: \{\[`key`: `string`\]: `string`; \}; `disabled?`: \{\[`key`: `string`\]: `string`; \}; \}; `variants?`: \{\[`key`: `string`\]: `object`; \}; `breakpoints?`: \{\[`key`: `string`\]: `object`; \}; `rules?`: `object`[]; \} \| `undefined`

Defined in: packages/core/src/controller/style/blocks/parse.ts:20

#### Parameters

##### style

\{ `declarations?`: \{\[`key`: `string`\]: `string`; \}; `states?`: \{ `hover?`: \{\[`key`: `string`\]: `string`; \}; `focus-visible?`: \{\[`key`: `string`\]: `string`; \}; `disabled?`: \{\[`key`: `string`\]: `string`; \}; \}; `variants?`: \{\[`key`: `string`\]: `object`; \}; `breakpoints?`: \{\[`key`: `string`\]: `object`; \}; `rules?`: `object`[]; \} \| `undefined`

###### Type Literal

\{ `declarations?`: \{\[`key`: `string`\]: `string`; \}; `states?`: \{ `hover?`: \{\[`key`: `string`\]: `string`; \}; `focus-visible?`: \{\[`key`: `string`\]: `string`; \}; `disabled?`: \{\[`key`: `string`\]: `string`; \}; \}; `variants?`: \{\[`key`: `string`\]: `object`; \}; `breakpoints?`: \{\[`key`: `string`\]: `object`; \}; `rules?`: `object`[]; \}

###### declarations?

\{\[`key`: `string`\]: `string`; \} = `...`

###### states?

\{ `hover?`: \{\[`key`: `string`\]: `string`; \}; `focus-visible?`: \{\[`key`: `string`\]: `string`; \}; `disabled?`: \{\[`key`: `string`\]: `string`; \}; \} = `...`

###### states.hover?

\{\[`key`: `string`\]: `string`; \} = `...`

###### states.focus-visible?

\{\[`key`: `string`\]: `string`; \} = `...`

###### states.disabled?

\{\[`key`: `string`\]: `string`; \} = `...`

###### variants?

\{\[`key`: `string`\]: `object`; \} = `...`

###### breakpoints?

\{\[`key`: `string`\]: `object`; \} = `...`

###### rules?

`object`[] = `...`

Ordered base rules; named preset rule arrays sparsely merge by id and append new rules.

---

`undefined`

#### Returns

##### Type Literal

\{ `declarations?`: \{\[`key`: `string`\]: `string`; \}; `states?`: \{ `hover?`: \{\[`key`: `string`\]: `string`; \}; `focus-visible?`: \{\[`key`: `string`\]: `string`; \}; `disabled?`: \{\[`key`: `string`\]: `string`; \}; \}; `variants?`: \{\[`key`: `string`\]: `object`; \}; `breakpoints?`: \{\[`key`: `string`\]: `object`; \}; `rules?`: `object`[]; \}

###### declarations?

> `optional` **declarations?**: `object`

###### Index Signature

\[`key`: `string`\]: `string`

###### states?

> `optional` **states?**: `object`

###### states.hover?

> `optional` **hover?**: `object`

###### Index Signature

\[`key`: `string`\]: `string`

###### states.focus-visible?

> `optional` **focus-visible?**: `object`

###### Index Signature

\[`key`: `string`\]: `string`

###### states.disabled?

> `optional` **disabled?**: `object`

###### Index Signature

\[`key`: `string`\]: `string`

###### variants?

> `optional` **variants?**: `object`

###### Index Signature

\[`key`: `string`\]: `object`

###### breakpoints?

> `optional` **breakpoints?**: `object`

###### Index Signature

\[`key`: `string`\]: `object`

###### rules?

> `optional` **rules?**: `object`[]

Ordered base rules; named preset rule arrays sparsely merge by id and append new rules.

---

`undefined`

---

### canonicalizeTokenInterface()

> **canonicalizeTokenInterface**(`value`): \{ `reads?`: `string`[]; `sets?`: \{\[`key`: `string`\]: `string`; \}; \} \| `undefined`

Defined in: packages/core/src/controller/style/blocks/parse.ts:24

#### Parameters

##### value

\{ `reads?`: `string`[]; `sets?`: \{\[`key`: `string`\]: `string`; \}; \} \| `undefined`

#### Returns

\{ `reads?`: `string`[]; `sets?`: \{\[`key`: `string`\]: `string`; \}; \} \| `undefined`

---

### parseStyleBlock()

> **parseStyleBlock**(`value`): `object`

Defined in: packages/core/src/controller/style/blocks/parse.ts:45

#### Parameters

##### value

`unknown`

#### Returns

##### declarations?

> `optional` **declarations?**: `object`

###### Index Signature

\[`key`: `string`\]: `string`

##### states?

> `optional` **states?**: `object`

###### states.hover?

> `optional` **hover?**: `object`

###### Index Signature

\[`key`: `string`\]: `string`

###### states.focus-visible?

> `optional` **focus-visible?**: `object`

###### Index Signature

\[`key`: `string`\]: `string`

###### states.disabled?

> `optional` **disabled?**: `object`

###### Index Signature

\[`key`: `string`\]: `string`

##### variants?

> `optional` **variants?**: `object`

###### Index Signature

\[`key`: `string`\]: `object`

##### breakpoints?

> `optional` **breakpoints?**: `object`

###### Index Signature

\[`key`: `string`\]: `object`

##### rules?

> `optional` **rules?**: `object`[]

Ordered base rules; named preset rule arrays sparsely merge by id and append new rules.

---

### parseTokenInterface()

> **parseTokenInterface**(`value`): `object`

Defined in: packages/core/src/controller/style/blocks/parse.ts:119

#### Parameters

##### value

`unknown`

#### Returns

`object`

##### reads?

> `optional` **reads?**: `string`[]

##### sets?

> `optional` **sets?**: `object`

###### Index Signature

\[`key`: `string`\]: `string`

---

### assertBreakpoints()

> **assertBreakpoints**(`breakpoints`): `void`

Defined in: packages/core/src/controller/style/breakpoints.ts:14

#### Parameters

##### breakpoints

readonly `object`[] \| `undefined`

#### Returns

`void`

---

### assertFonts()

> **assertFonts**(`fonts`): `void`

Defined in: packages/core/src/controller/style/fonts.ts:25

#### Parameters

##### fonts

readonly [`FontFamilyDefinition`](#fontfamilydefinition)[]

#### Returns

`void`

---

### assertFont()

> **assertFont**(`font`): `void`

Defined in: packages/core/src/controller/style/fonts.ts:34

#### Parameters

##### font

[`FontFamilyDefinition`](#fontfamilydefinition)

#### Returns

`void`

---

### fontStyles()

> **fontStyles**(`font`): (`"normal"` \| `"italic"`)[]

Defined in: packages/core/src/controller/style/fonts.ts:79

#### Parameters

##### font

[`FontFamilyDefinition`](#fontfamilydefinition)

#### Returns

(`"normal"` \| `"italic"`)[]

---

### canonicalizeLayout()

> **canonicalizeLayout**(`layout`): \{ `position?`: `"auto"` \| `"absolute"`; `x?`: `number`; `y?`: `number`; `width?`: \{ `mode`: `"fill"` \| `"auto"` \| `"hug"` \| `"fixed"`; `size?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; `min?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; `max?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; \}; `height?`: \{ `mode`: `"fill"` \| `"auto"` \| `"hug"` \| `"fixed"`; `size?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; `min?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; `max?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; \}; `direction?`: `"row"` \| `"column"`; `gap?`: `string`; `padding?`: `string` \| \{ `top?`: `string`; `right?`: `string`; `bottom?`: `string`; `left?`: `string`; \}; `margin?`: `string` \| \{ `top?`: `string`; `right?`: `string`; `bottom?`: `string`; `left?`: `string`; \}; `justify?`: `"start"` \| `"center"` \| `"end"` \| `"space-between"`; `align?`: `"start"` \| `"center"` \| `"end"` \| `"stretch"`; `wrap?`: `boolean`; `breakpoints?`: \{\[`key`: `string`\]: `object`; \}; \} \| `undefined`

Defined in: packages/core/src/controller/style/layout.ts:22

Canonical layout: omitted keys dropped, breakpoint ids sorted, nested values cloned.

#### Parameters

##### layout

\{ `position?`: `"auto"` \| `"absolute"`; `x?`: `number`; `y?`: `number`; `width?`: \{ `mode`: `"fill"` \| `"auto"` \| `"hug"` \| `"fixed"`; `size?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; `min?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; `max?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; \}; `height?`: \{ `mode`: `"fill"` \| `"auto"` \| `"hug"` \| `"fixed"`; `size?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; `min?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; `max?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; \}; `direction?`: `"row"` \| `"column"`; `gap?`: `string`; `padding?`: `string` \| \{ `top?`: `string`; `right?`: `string`; `bottom?`: `string`; `left?`: `string`; \}; `margin?`: `string` \| \{ `top?`: `string`; `right?`: `string`; `bottom?`: `string`; `left?`: `string`; \}; `justify?`: `"start"` \| `"center"` \| `"end"` \| `"space-between"`; `align?`: `"start"` \| `"center"` \| `"end"` \| `"stretch"`; `wrap?`: `boolean`; `breakpoints?`: \{\[`key`: `string`\]: `object`; \}; \} \| `undefined`

#### Returns

\{ `position?`: `"auto"` \| `"absolute"`; `x?`: `number`; `y?`: `number`; `width?`: \{ `mode`: `"fill"` \| `"auto"` \| `"hug"` \| `"fixed"`; `size?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; `min?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; `max?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; \}; `height?`: \{ `mode`: `"fill"` \| `"auto"` \| `"hug"` \| `"fixed"`; `size?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; `min?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; `max?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; \}; `direction?`: `"row"` \| `"column"`; `gap?`: `string`; `padding?`: `string` \| \{ `top?`: `string`; `right?`: `string`; `bottom?`: `string`; `left?`: `string`; \}; `margin?`: `string` \| \{ `top?`: `string`; `right?`: `string`; `bottom?`: `string`; `left?`: `string`; \}; `justify?`: `"start"` \| `"center"` \| `"end"` \| `"space-between"`; `align?`: `"start"` \| `"center"` \| `"end"` \| `"stretch"`; `wrap?`: `boolean`; `breakpoints?`: \{\[`key`: `string`\]: `object`; \}; \} \| `undefined`

---

### layoutTokenRefs()

> **layoutTokenRefs**(`layout`): `string`[]

Defined in: packages/core/src/controller/style/layout.ts:27

#### Parameters

##### layout

\{ `position?`: `"auto"` \| `"absolute"`; `x?`: `number`; `y?`: `number`; `width?`: \{ `mode`: `"fill"` \| `"auto"` \| `"hug"` \| `"fixed"`; `size?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; `min?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; `max?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; \}; `height?`: \{ `mode`: `"fill"` \| `"auto"` \| `"hug"` \| `"fixed"`; `size?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; `min?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; `max?`: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}; \}; `direction?`: `"row"` \| `"column"`; `gap?`: `string`; `padding?`: `string` \| \{ `top?`: `string`; `right?`: `string`; `bottom?`: `string`; `left?`: `string`; \}; `margin?`: `string` \| \{ `top?`: `string`; `right?`: `string`; `bottom?`: `string`; `left?`: `string`; \}; `justify?`: `"start"` \| `"center"` \| `"end"` \| `"space-between"`; `align?`: `"start"` \| `"center"` \| `"end"` \| `"stretch"`; `wrap?`: `boolean`; `breakpoints?`: \{\[`key`: `string`\]: `object`; \}; \} \| `undefined`

#### Returns

`string`[]

---

### parseLayout()

> **parseLayout**(`value`): `object`

Defined in: packages/core/src/controller/style/layout.ts:34

#### Parameters

##### value

`unknown`

#### Returns

`object`

##### position?

> `optional` **position?**: `"auto"` \| `"absolute"`

##### x?

> `optional` **x?**: `number`

##### y?

> `optional` **y?**: `number`

##### width?

> `optional` **width?**: `object`

###### width.mode

> **mode**: `"fill"` \| `"auto"` \| `"hug"` \| `"fixed"`

###### width.size?

> `optional` **size?**: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}

###### width.min?

> `optional` **min?**: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}

###### width.max?

> `optional` **max?**: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}

##### height?

> `optional` **height?**: `object`

###### height.mode

> **mode**: `"fill"` \| `"auto"` \| `"hug"` \| `"fixed"`

###### height.size?

> `optional` **size?**: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}

###### height.min?

> `optional` **min?**: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}

###### height.max?

> `optional` **max?**: `string` \| `number` \| \{ `unit`: `"%"`; `value`: `number`; \}

##### direction?

> `optional` **direction?**: `"row"` \| `"column"`

##### gap?

> `optional` **gap?**: `string`

##### padding?

> `optional` **padding?**: `string` \| \{ `top?`: `string`; `right?`: `string`; `bottom?`: `string`; `left?`: `string`; \}

##### margin?

> `optional` **margin?**: `string` \| \{ `top?`: `string`; `right?`: `string`; `bottom?`: `string`; `left?`: `string`; \}

##### justify?

> `optional` **justify?**: `"start"` \| `"center"` \| `"end"` \| `"space-between"`

##### align?

> `optional` **align?**: `"start"` \| `"center"` \| `"end"` \| `"stretch"`

##### wrap?

> `optional` **wrap?**: `boolean`

##### breakpoints?

> `optional` **breakpoints?**: `object`

###### Index Signature

\[`key`: `string`\]: `object`

---

### refsInText()

> **refsInText**(`value`): `string`[]

Defined in: packages/core/src/controller/style/references/text.ts:7

Collect UUIDs from canonical `{token:uuid}` references embedded in CSS values.

#### Parameters

##### value

`string`

#### Returns

`string`[]

---

### assertStyleSelector()

> **assertStyleSelector**(`selector`): `void`

Defined in: packages/core/src/controller/style/selectors.ts:8

Validate the portable, local subset of CSS selectors used by authored style rules.

#### Parameters

##### selector

`string`

#### Returns

`void`

---

### selectorClassNames()

> **selectorClassNames**(`selector`): `string`[]

Defined in: packages/core/src/controller/style/selectors.ts:105

Return distinct class tokens in first-use order, ignoring dots inside attribute strings.

#### Parameters

##### selector

`string`

#### Returns

`string`[]

---

### appendStyleSelectorSuffix()

> **appendStyleSelectorSuffix**(`selector`, `suffix`): `string`

Defined in: packages/core/src/controller/style/selectors.ts:154

Add a state suffix to every selector group without splitting functional pseudo arguments.

#### Parameters

##### selector

`string`

##### suffix

`string`

#### Returns

`string`

---

### bindStyleRuleSelector()

> **bindStyleRuleSelector**(`selector`, `names`): `Record`\<`string`, `string`\>

Defined in: packages/core/src/controller/style/selectors.ts:212

Bind every authored class reference to a node, rejecting missing or extra bindings.

#### Parameters

##### selector

`string`

##### names

`ReadonlyMap`\<`string`, `string`\>

#### Returns

`Record`\<`string`, `string`\>

---

### renderStyleRuleSelector()

> **renderStyleRuleSelector**(`rule`, `names`): `string`

Defined in: packages/core/src/controller/style/selectors.ts:303

Re-render an authored selector after a bound node's readable class name changes.

#### Parameters

##### rule

`Pick`\<[`StyleRule`](#stylerule), `"selector"` \| `"bindings"`\>

##### names

`ReadonlyMap`\<`string`, `string`\>

#### Returns

`string`

---

### replaceSelectorClasses()

> **replaceSelectorClasses**(`selector`, `replace`): `string`

Defined in: packages/core/src/controller/style/selectors.ts:317

Replace only parsed class identifiers; attribute values and quoted text stay untouched.

#### Parameters

##### selector

`string`

##### replace

(`className`) => `string`

#### Returns

`string`

---

### tokenReferencesByType()

> **tokenReferencesByType**(`tree`, `type`): `` `{token:${string}}` ``[]

Defined in: packages/core/src/controller/style/tokens/global/query.ts:8

UUID references for tokens with a given value type, sorted for stable UI options.

#### Parameters

##### tree

`unknown`

##### type

[`DesignTokenValueType`](#designtokenvaluetype)

#### Returns

`` `{token:${string}}` ``[]

---

### fontFamilyTokens()

> **fontFamilyTokens**(`tree`): ([`IndexedToken`](#indexedtoken) & [`FontFamilyDefinition`](#fontfamilydefinition))[]

Defined in: packages/core/src/controller/style/tokens/global/query.ts:16

Font-family records in the token tree, retaining the index's deterministic family order.

#### Parameters

##### tree

`unknown`

#### Returns

([`IndexedToken`](#indexedtoken) & [`FontFamilyDefinition`](#fontfamilydefinition))[]

---

### tokenCssPropertyName()

> **tokenCssPropertyName**(`path`): `string`

Defined in: packages/core/src/controller/style/tokens/global/selector.ts:2

Generate a CSS custom-property name from the token's derived family/group/label path.

#### Parameters

##### path

`string`

#### Returns

`string`

---

### emptyTokenTree()

> **emptyTokenTree**(): [`TokenTree`](#tokentree)

Defined in: packages/core/src/controller/style/tokens/global/tree.ts:40

#### Returns

[`TokenTree`](#tokentree)

---

### canonicalizeTokenTree()

> **canonicalizeTokenTree**(`tree`): [`TokenTree`](#tokentree)

Defined in: packages/core/src/controller/style/tokens/global/tree.ts:44

#### Parameters

##### tree

`unknown`

#### Returns

[`TokenTree`](#tokentree)

---

### readTokenTree()

> **readTokenTree**(`tree`): [`TokenIndex`](#tokenindex)

Defined in: packages/core/src/controller/style/tokens/global/tree.ts:54

#### Parameters

##### tree

`unknown`

#### Returns

[`TokenIndex`](#tokenindex)

---

### setTokenInTree()

> **setTokenInTree**(`tree`, `family`, `token`): `Readonly`\<\{ `color`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `space`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `radius`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `shadow`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `type`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `font`: `Readonly`\<`Record`\<[`DesignTokenUuid`](#designtokenuuid), [`FontFamilyDefinition`](#fontfamilydefinition)\>\>; \}\>

Defined in: packages/core/src/controller/style/tokens/global/tree.ts:102

#### Parameters

##### tree

[`TokenTree`](#tokentree)

##### family

[`DesignTokenFamily`](#designtokenfamily)

##### token

[`TokenDefinition`](#tokendefinition)

#### Returns

`Readonly`\<\{ `color`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `space`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `radius`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `shadow`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `type`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `font`: `Readonly`\<`Record`\<[`DesignTokenUuid`](#designtokenuuid), [`FontFamilyDefinition`](#fontfamilydefinition)\>\>; \}\>

---

### removeTokenFromTree()

> **removeTokenFromTree**(`tree`, `family`, `uuid`): `Readonly`\<\{ `color`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `space`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `radius`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `shadow`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `type`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `font`: `Readonly`\<`Record`\<[`DesignTokenUuid`](#designtokenuuid), [`FontFamilyDefinition`](#fontfamilydefinition)\>\>; \}\>

Defined in: packages/core/src/controller/style/tokens/global/tree.ts:112

#### Parameters

##### tree

[`TokenTree`](#tokentree)

##### family

[`DesignTokenFamily`](#designtokenfamily)

##### uuid

`string`

#### Returns

`Readonly`\<\{ `color`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `space`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `radius`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `shadow`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `type`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `font`: `Readonly`\<`Record`\<[`DesignTokenUuid`](#designtokenuuid), [`FontFamilyDefinition`](#fontfamilydefinition)\>\>; \}\>

---

### tokenReference()

> **tokenReference**(`value`): `string` \| `undefined`

Defined in: packages/core/src/controller/style/tokens/syntax.ts:8

#### Parameters

##### value

`unknown`

#### Returns

`string` \| `undefined`

---

### tokenReferenceValue()

> **tokenReferenceValue**(`uuid`): `` `{token:${string}}` ``

Defined in: packages/core/src/controller/style/tokens/syntax.ts:13

#### Parameters

##### uuid

`string`

#### Returns

`` `{token:${string}}` ``

---

### matchesSchemaValue()

> **matchesSchemaValue**(`value`, `schema`, `references?`): `boolean`

Defined in: packages/core/src/controller/validation/json-schema-value.ts:9

Test a JSON value against its preserved JSON Schema contract, including unions.

#### Parameters

##### value

`unknown`

##### schema

[`JsonSchema`](#jsonschema)

##### references?

`Readonly`\<`Record`\<`string`, `unknown`\>\>

#### Returns

`boolean`

---

### mergeChildFieldOverrides()

> **mergeChildFieldOverrides**(`target`, `source`): [`ChildFieldOverrides`](#childfieldoverrides)

Defined in: packages/core/src/document/child-fields.ts:4

Merge sparse variant overrides by path and field, with the source winning.

#### Parameters

##### target

[`ChildFieldOverrides`](#childfieldoverrides) \| `undefined`

##### source

[`ChildFieldOverrides`](#childfieldoverrides)

#### Returns

[`ChildFieldOverrides`](#childfieldoverrides)

---

### mergeChildFieldContext()

> **mergeChildFieldContext**(`inherited`, `own`, `prefix`): [`ChildFieldOverrides`](#childfieldoverrides) \| `undefined`

Defined in: packages/core/src/document/child-fields.ts:16

Carry nested overrides into a composed instance while keeping outer edits authoritative.

#### Parameters

##### inherited

[`ChildFieldOverrides`](#childfieldoverrides) \| `undefined`

##### own

[`ChildFieldOverrides`](#childfieldoverrides) \| `undefined`

##### prefix

`string` \| `null`

#### Returns

[`ChildFieldOverrides`](#childfieldoverrides) \| `undefined`

---

### childOverridePath()

> **childOverridePath**(`parent`, `id`): `string` \| `null`

Defined in: packages/core/src/document/child-fields.ts:34

Return the sparse override path for a child instance, omitting component roots.

#### Parameters

##### parent

`string` \| `null` \| `undefined`

##### id

`string`

#### Returns

`string` \| `null`

---

### isVoidHtmlTag()

> **isVoidHtmlTag**(`tagName`): `boolean`

Defined in: packages/core/src/document/html-tags.ts:54

#### Parameters

##### tagName

`string`

#### Returns

`boolean`

---

### htmlTagOptions()

> **htmlTagOptions**(`current?`): readonly `string`[]

Defined in: packages/core/src/document/html-tags.ts:58

#### Parameters

##### current?

`string`

#### Returns

readonly `string`[]

---

### createCatalogUuid()

> **createCatalogUuid**(): `string`

Defined in: packages/core/src/document/ids.ts:8

RFC 4122 uuid for catalog definitions, tree nodes, and shared schemas.

#### Returns

`string`

---

### createId()

> **createId**(): `string`

Defined in: packages/core/src/document/ids.ts:13

Stable id safe for `data-id` and the document schema.

#### Returns

`string`

---

### tokenByUuid()

> **tokenByUuid**(`catalog`, `uuid`): [`IndexedToken`](#indexedtoken) \| `undefined`

Defined in: packages/core/src/queries.ts:18

Read a token by UUID from Catalog data, preserving the token parser's inferred result type.

#### Parameters

##### catalog

`ProjectCatalog`

##### uuid

`string`

#### Returns

[`IndexedToken`](#indexedtoken) \| `undefined`

---

### tokenByReference()

> **tokenByReference**(`catalog`, `value`): [`IndexedToken`](#indexedtoken) \| `undefined`

Defined in: packages/core/src/queries.ts:23

Resolve a Catalog token reference with the same parser used by Style token operations.

#### Parameters

##### catalog

`ProjectCatalog`

##### value

`unknown`

#### Returns

[`IndexedToken`](#indexedtoken) \| `undefined`

---

### tokenReferencePaths()

> **tokenReferencePaths**(`catalog`, `uuid`): `string`[]

Defined in: packages/core/src/queries.ts:28

Return sorted token paths that use a UUID in values or breakpoint overrides.

#### Parameters

##### catalog

`ProjectCatalog`

##### uuid

`string`

#### Returns

`string`[]

---

### breakpointLabel()

> **breakpointLabel**(`breakpoint`): `string`

Defined in: packages/core/src/schema/document.ts:123

Display name for a configured viewport.

#### Parameters

##### breakpoint

`Pick`\<[`Breakpoint`](#breakpoint), `"uuid"` \| `"label"`\>

#### Returns

`string`

---

### primaryJsonSchemaType()

> **primaryJsonSchemaType**(`schema`): `string` \| `undefined`

Defined in: packages/core/src/schema/json-schema-fields.ts:6

Select the primary type declared by a JSON Schema node.

#### Parameters

##### schema

[`JsonSchema`](#jsonschema)

#### Returns

`string` \| `undefined`

---

### fieldsFromJsonSchema()

> **fieldsFromJsonSchema**(`schema`): [`JsonSchemaField`](#jsonschemafield)[]

Defined in: packages/core/src/schema/json-schema-fields.ts:11

Derive editor field definitions from a JSON Schema object contract.

#### Parameters

##### schema

[`JsonSchema`](#jsonschema)

#### Returns

[`JsonSchemaField`](#jsonschemafield)[]

---

### projectCatalogJsonSchema()

> **projectCatalogJsonSchema**(): `Record`\<`string`, `unknown`\>

Defined in: packages/core/src/schema/node-model/json-schema.ts:4

Plain JSON Schema for Ajv and external tools.

#### Returns

`Record`\<`string`, `unknown`\>

---

### fontStack()

> **fontStack**(`font`): `string`

Defined in: packages/core/src/tokens/css-properties.ts:78

CSS `font-family` stack: quoted family name, then fallbacks. Generics stay bare.

#### Parameters

##### font

[`FontFamilyDefinition`](#fontfamilydefinition)

#### Returns

`string`

---

### quoteFamily()

> **quoteFamily**(`name`): `string`

Defined in: packages/core/src/tokens/css-properties.ts:82

#### Parameters

##### name

`string`

#### Returns

`string`

---

### tokenCustomProperty()

> **tokenCustomProperty**(`path`): `string`

Defined in: packages/core/src/tokens/names.ts:19

`color.blue.500` (derived from family/group/label) → `--color-blue-500`.

#### Parameters

##### path

`string`

#### Returns

`string`

---

### typographyCustomProperty()

> **typographyCustomProperty**(`path`, `field`): `string`

Defined in: packages/core/src/tokens/names.ts:24

Typography field on `type.body` → `--type-body--font-size`.

#### Parameters

##### path

`string`

##### field

`string`

#### Returns

`string`

---

### loadTokens()

> **loadTokens**(`input?`): [`ResolvedDesign`](#resolveddesign)

Defined in: packages/core/src/tokens/resolve.ts:50

Index canonical token records and resolve their UUID references.

#### Parameters

##### input?

[`DesignInput`](#designinput) = `{}`

#### Returns

[`ResolvedDesign`](#resolveddesign)

---

### isBreakpointEnabled()

> **isBreakpointEnabled**(`breakpoint`): `boolean`

Defined in: packages/core/src/tokens/resolve.ts:70

#### Parameters

##### breakpoint

`Pick`\<[`Breakpoint`](#breakpoint), `"enabled"`\>

#### Returns

`boolean`

---

### configuredBreakpoints()

> **configuredBreakpoints**(`breakpoints`): `object`[]

Defined in: packages/core/src/tokens/resolve.ts:75

All configured viewports, including disabled ones, sorted by min-width.

#### Parameters

##### breakpoints

readonly `object`[] \| `undefined`

#### Returns

`object`[]

---

### activeBreakpoints()

> **activeBreakpoints**(`breakpoints`): `object`[]

Defined in: packages/core/src/tokens/resolve.ts:85

Viewports shown in the editor, on the stage, and in compiled design CSS.

#### Parameters

##### breakpoints

readonly `object`[] \| `undefined`

#### Returns

`object`[]

---

### isPlainObject()

> **isPlainObject**(`value`): `value is Record<string, unknown>`

Defined in: packages/core/src/utils.ts:4

#### Parameters

##### value

`unknown`

#### Returns

`value is Record<string, unknown>`

---

### canonicalizeJson()

> **canonicalizeJson**(`value`): [`JsonValue`](#jsonvalue)

Defined in: packages/core/src/utils.ts:9

Deep-clone JSON and sort object keys for deterministic token-tree normalization.

#### Parameters

##### value

[`JsonValue`](#jsonvalue)

#### Returns

[`JsonValue`](#jsonvalue)

---

### isJsonValue()

> **isJsonValue**(`value`): `value is JsonValue`

Defined in: packages/core/src/utils.ts:22

#### Parameters

##### value

`unknown`

#### Returns

`value is JsonValue`
