**Facadeur Core API**

---

# Facadeur Core API

## Classes

### CoreController

Defined in: packages/core/src/controller/project/controller.ts:68

Single source of truth for ProjectCatalog and catalog editing selection.
Design tokens, fonts, and ProjectCatalog.globalStyles live on the catalog snapshot;
node/schema preview flows go through [NodeController](#nodecontroller).

#### Implements

- [`CoreControllerHost`](#corecontrollerhost)

#### Constructors

##### Constructor

> **new CoreController**(`catalog?`): [`CoreController`](#corecontroller)

Defined in: packages/core/src/controller/project/controller.ts:75

###### Parameters

###### catalog?

`ProjectCatalog` = `...`

###### Returns

[`CoreController`](#corecontroller)

#### Properties

##### node

> `readonly` **node**: [`NodeController`](#nodecontroller)

Defined in: packages/core/src/controller/project/controller.ts:73

#### Methods

##### subscribe()

> **subscribe**(`listener`): () => `boolean`

Defined in: packages/core/src/controller/project/controller.ts:80

###### Parameters

###### listener

() => `void`

###### Returns

() => `boolean`

##### getSnapshot()

> **getSnapshot**(): [`CoreSnapshot`](#coresnapshot)

Defined in: packages/core/src/controller/project/controller.ts:85

###### Returns

[`CoreSnapshot`](#coresnapshot)

###### Implementation of

[`CoreControllerHost`](#corecontrollerhost).[`getSnapshot`](#getsnapshot-1)

##### getDefinition()

> **getDefinition**(`uuid`): \{ `kind`: `CatalogMapKey`; `definition`: `NodeDefinition`; \} \| `null`

Defined in: packages/core/src/controller/project/controller.ts:97

###### Parameters

###### uuid

`string`

###### Returns

\{ `kind`: `CatalogMapKey`; `definition`: `NodeDefinition`; \} \| `null`

##### getDefinitionDisplayName()

> **getDefinitionDisplayName**(`uuid`): `string` \| `null`

Defined in: packages/core/src/controller/project/controller.ts:102

###### Parameters

###### uuid

`string`

###### Returns

`string` \| `null`

##### getDefinitionSummaries()

> **getDefinitionSummaries**(): `object`[]

Defined in: packages/core/src/controller/project/controller.ts:107

###### Returns

`object`[]

##### getEffectiveNodeTagName()

> **getEffectiveNodeTagName**(`nodeUuid`): `string` \| `null`

Defined in: packages/core/src/controller/project/controller.ts:111

###### Parameters

###### nodeUuid

`string`

###### Returns

`string` \| `null`

##### getActiveBreakpoints()

> **getActiveBreakpoints**(): `object`[]

Defined in: packages/core/src/controller/project/controller.ts:119

###### Returns

`object`[]

##### getDesignSnapshot()

> **getDesignSnapshot**(): `object`

Defined in: packages/core/src/controller/project/controller.ts:123

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

Defined in: packages/core/src/controller/project/controller.ts:131

###### Returns

`object`[]

##### getSchema()

> **getSchema**(`uuid`): `Readonly`\<`Record`\<`string`, `unknown`\>\> \| `undefined`

Defined in: packages/core/src/controller/project/controller.ts:138

###### Parameters

###### uuid

`string`

###### Returns

`Readonly`\<`Record`\<`string`, `unknown`\>\> \| `undefined`

##### getDesignProps()

> **getDesignProps**(): `DesignPropDefinition`[]

Defined in: packages/core/src/controller/project/controller.ts:143

###### Returns

`DesignPropDefinition`[]

##### getProjectStyleSuggestions()

> **getProjectStyleSuggestions**(): `object`

Defined in: packages/core/src/controller/project/controller.ts:147

###### Returns

`object`

###### keys

> **keys**: `string`[]

###### valuesByKey

> **valuesByKey**: `object`

###### Index Signature

\[`k`: `string`\]: `string`[]

###### options

> **options**: `object`[] = `tokenOptions`

##### getTokenByUUID()

> **getTokenByUUID**(`uuid`): [`IndexedToken`](#indexedtoken) \| `undefined`

Defined in: packages/core/src/controller/project/controller.ts:151

###### Parameters

###### uuid

`string`

###### Returns

[`IndexedToken`](#indexedtoken) \| `undefined`

##### getTokenByReference()

> **getTokenByReference**(`value`): [`IndexedToken`](#indexedtoken) \| `undefined`

Defined in: packages/core/src/controller/project/controller.ts:155

###### Parameters

###### value

`unknown`

###### Returns

[`IndexedToken`](#indexedtoken) \| `undefined`

##### getTokensReferencingUUID()

> **getTokensReferencingUUID**(`uuid`): `string`[]

Defined in: packages/core/src/controller/project/controller.ts:159

###### Parameters

###### uuid

`string`

###### Returns

`string`[]

##### replaceCatalog()

> **replaceCatalog**(`catalog`): `void`

Defined in: packages/core/src/controller/project/controller.ts:163

###### Parameters

###### catalog

`unknown`

###### Returns

`void`

##### openDefinition()

> **openDefinition**(`uuid`): `void`

Defined in: packages/core/src/controller/project/controller.ts:172

###### Parameters

###### uuid

`string`

###### Returns

`void`

###### Implementation of

[`CoreControllerHost`](#corecontrollerhost).[`openDefinition`](#opendefinition-3)

##### closeDefinition()

> **closeDefinition**(): `void`

Defined in: packages/core/src/controller/project/controller.ts:182

###### Returns

`void`

###### Implementation of

[`CoreControllerHost`](#corecontrollerhost).[`closeDefinition`](#closedefinition-1)

##### applyDesignCommand()

> **applyDesignCommand**(`command`): `void`

Defined in: packages/core/src/controller/project/controller.ts:189

###### Parameters

###### command

[`CatalogDesignCommand`](#catalogdesigncommand)

###### Returns

`void`

##### createDefinition()

> **createDefinition**(`kind`, `definition`): `void`

Defined in: packages/core/src/controller/project/controller.ts:194

###### Parameters

###### kind

`CatalogMapKey`

###### definition

`NodeDefinition`

###### Returns

`void`

##### patchDefinition()

> **patchDefinition**(`kind`, `uuid`, `patch`): `void`

Defined in: packages/core/src/controller/project/controller.ts:198

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

Defined in: packages/core/src/controller/project/controller.ts:218

###### Parameters

###### kind

`CatalogMapKey`

###### uuid

`string`

###### Returns

`void`

##### upsertSchema()

> **upsertSchema**(`uuid`, `schema`): `void`

Defined in: packages/core/src/controller/project/controller.ts:227

###### Parameters

###### uuid

`string`

###### schema

`JsonSchemaObject`

###### Returns

`void`

##### removeSchema()

> **removeSchema**(`uuid`): `void`

Defined in: packages/core/src/controller/project/controller.ts:232

###### Parameters

###### uuid

`string`

###### Returns

`void`

##### upsertDesignProp()

> **upsertDesignProp**(`prop`): `void`

Defined in: packages/core/src/controller/project/controller.ts:236

###### Parameters

###### prop

`DesignPropDefinition`

###### Returns

`void`

##### removeDesignProp()

> **removeDesignProp**(`uuid`): `void`

Defined in: packages/core/src/controller/project/controller.ts:240

###### Parameters

###### uuid

`string`

###### Returns

`void`

##### patchNodeField()

> **patchNodeField**(`field`, `value`): `void`

Defined in: packages/core/src/controller/project/controller.ts:244

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

Defined in: packages/core/src/controller/project/controller.ts:251

###### Parameters

###### nodeUuid

`string`

###### record

`Readonly`\<`Record`\<`string`, `unknown`\>\>

###### Returns

`void`

##### patchNodeComposition()

> **patchNodeComposition**(`nodeUuid`, `patch`): `void`

Defined in: packages/core/src/controller/project/controller.ts:256

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

Defined in: packages/core/src/controller/project/controller.ts:298

###### Parameters

###### nodeUuid

`string`

###### record

`Readonly`\<`Record`\<`string`, `string`\>\>

###### Returns

`void`

##### patchNodeDomText()

> **patchNodeDomText**(`nodeUuid`, `text`): `void`

Defined in: packages/core/src/controller/project/controller.ts:322

###### Parameters

###### nodeUuid

`string`

###### text

`string`

###### Returns

`void`

##### patchNodeClassList()

> **patchNodeClassList**(`nodeUuid`, `classes`): `void`

Defined in: packages/core/src/controller/project/controller.ts:327

###### Parameters

###### nodeUuid

`string`

###### classes

readonly `string`[]

###### Returns

`void`

##### patchNodeTagName()

> **patchNodeTagName**(`nodeUuid`, `tagName`): `void`

Defined in: packages/core/src/controller/project/controller.ts:332

###### Parameters

###### nodeUuid

`string`

###### tagName

`string`

###### Returns

`void`

##### patchNodeName()

> **patchNodeName**(`nodeUuid`, `name`): `void`

Defined in: packages/core/src/controller/project/controller.ts:337

###### Parameters

###### nodeUuid

`string`

###### name

`string`

###### Returns

`void`

##### patchDefinitionName()

> **patchDefinitionName**(`name`): `void`

Defined in: packages/core/src/controller/project/controller.ts:344

###### Parameters

###### name

`string`

###### Returns

`void`

##### patchDefinitionPreviewField()

> **patchDefinitionPreviewField**(`definitionUuid`, `field`, `value`): `void`

Defined in: packages/core/src/controller/project/controller.ts:353

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

Defined in: packages/core/src/controller/project/controller.ts:388

###### Parameters

###### target

[`InspectorFormChangeTarget`](#inspectorformchangetarget)

###### Returns

`void`

###### Implementation of

[`CoreControllerHost`](#corecontrollerhost).[`applyInspectorFormChange`](#applyinspectorformchange-1)

##### insertCatalogNode()

> **insertCatalogNode**(`parentUuid`, `index`, `node`): `void`

Defined in: packages/core/src/controller/project/controller.ts:494

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

Defined in: packages/core/src/controller/project/controller.ts:504

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

Defined in: packages/core/src/controller/project/controller.ts:526

###### Parameters

###### nodeUuid

`string`

###### Returns

`void`

##### moveCatalogNode()

> **moveCatalogNode**(`nodeUuid`, `parentUuid`, `index`): `void`

Defined in: packages/core/src/controller/project/controller.ts:535

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

Defined in: packages/core/src/controller/project/controller.ts:545

###### Parameters

###### uuid

`string`

###### Returns

`void`

###### Implementation of

[`CoreControllerHost`](#corecontrollerhost).[`selectNode`](#selectnode-2)

##### persist()

> **persist**(`port`): `Promise`\<`void`\>

Defined in: packages/core/src/controller/project/controller.ts:551

###### Parameters

###### port

[`CatalogPort`](#catalogport)

###### Returns

`Promise`\<`void`\>

##### createDefinitionFromPort()

> **createDefinitionFromPort**(`port`, `kind`, `definition`): `Promise`\<`string` \| `undefined`\>

Defined in: packages/core/src/controller/project/controller.ts:555

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

Defined in: packages/core/src/controller/project/controller.ts:567

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

#### Properties

##### uuid

> **uuid**: `string`

Defined in: packages/core/src/controller/project/node/preview/prop-ref.ts:9

##### name

> **name**: `string`

Defined in: packages/core/src/controller/project/node/preview/prop-ref.ts:10

##### ref

> **ref**: `string`

Defined in: packages/core/src/controller/project/node/preview/prop-ref.ts:12

Stored field value: `{prop:uuid}`.

##### kind

> **kind**: `"design"` \| `"component"` \| `"item"` \| `"index"`

Defined in: packages/core/src/controller/project/node/preview/prop-ref.ts:13

##### valueType?

> `optional` **valueType?**: `string`

Defined in: packages/core/src/controller/project/node/preview/prop-ref.ts:14

---

### RepeaterReferenceScope

> **RepeaterReferenceScope** = `object`

Defined in: packages/core/src/controller/project/node/preview/reference-resolver.ts:4

#### Properties

##### nodeUuid

> `readonly` **nodeUuid**: `string`

Defined in: packages/core/src/controller/project/node/preview/reference-resolver.ts:5

##### indexName

> `readonly` **indexName**: `string`

Defined in: packages/core/src/controller/project/node/preview/reference-resolver.ts:6

##### index

> `readonly` **index**: `number`

Defined in: packages/core/src/controller/project/node/preview/reference-resolver.ts:7

##### itemPath?

> `readonly` `optional` **itemPath?**: `string`

Defined in: packages/core/src/controller/project/node/preview/reference-resolver.ts:8

##### item

> `readonly` **item**: [`FieldValue`](#fieldvalue)

Defined in: packages/core/src/controller/project/node/preview/reference-resolver.ts:9

##### itemSchema

> `readonly` **itemSchema**: `Record`\<`string`, `unknown`\> \| `null`

Defined in: packages/core/src/controller/project/node/preview/reference-resolver.ts:10

---

### ReferenceResolutionContext

> **ReferenceResolutionContext** = `object`

Defined in: packages/core/src/controller/project/node/preview/reference-resolver.ts:13

#### Properties

##### catalog

> `readonly` **catalog**: `ProjectCatalog`

Defined in: packages/core/src/controller/project/node/preview/reference-resolver.ts:14

##### componentProps?

> `readonly` `optional` **componentProps?**: `Readonly`\<`Record`\<`string`, [`FieldValue`](#fieldvalue)\>\>

Defined in: packages/core/src/controller/project/node/preview/reference-resolver.ts:15

##### componentState?

> `readonly` `optional` **componentState?**: `Readonly`\<`Record`\<`string`, [`FieldValue`](#fieldvalue) \| `null`\>\>

Defined in: packages/core/src/controller/project/node/preview/reference-resolver.ts:16

##### repeaterScopes?

> `readonly` `optional` **repeaterScopes?**: readonly [`RepeaterReferenceScope`](#repeaterreferencescope)[]

Defined in: packages/core/src/controller/project/node/preview/reference-resolver.ts:17

##### item?

> `readonly` `optional` **item?**: [`FieldValue`](#fieldvalue)

Defined in: packages/core/src/controller/project/node/preview/reference-resolver.ts:19

Compatibility for callers that only provide the previous single-item context.

---

### TokenTier

> **TokenTier** = `"primitive"` \| `"semantic"` \| `"component"`

Defined in: packages/core/src/controller/style/tokens/types.ts:10

---

### TokenTree

> **TokenTree** = [`DesignTokenSet`](#designtokenset)

Defined in: packages/core/src/controller/style/tokens/types.ts:12

---

### TokenDefinition

> **TokenDefinition** = [`DesignTokenRecord`](#designtokenrecord)

Defined in: packages/core/src/controller/style/tokens/types.ts:13

---

### IdentifiedTokenDefinition

> **IdentifiedTokenDefinition** = [`DesignTokenRecord`](#designtokenrecord)

Defined in: packages/core/src/controller/style/tokens/types.ts:14

---

### NodeType

> **NodeType** = _typeof_ [`nodeTypes`](#nodetypes)\[`number`\]

Defined in: packages/core/src/document/kinds.ts:10

---

### DefaultKind

> **DefaultKind** = _typeof_ [`defaultKinds`](#defaultkinds)\[`number`\]

Defined in: packages/core/src/document/kinds.ts:14

---

### TokenType

> **TokenType** = [`DesignTokenValueType`](#designtokenvaluetype)

Defined in: packages/core/src/schema/design-tokens.ts:22

---

### FieldDefinition

> **FieldDefinition** = `Static`\<_typeof_ `fieldDefinitionSchema`\>

Defined in: packages/core/src/schema/document.ts:86

---

### ChildFieldOverrides

> **ChildFieldOverrides** = `Record`\<`string`, `Record`\<`string`, [`FieldValue`](#fieldvalue)\>\>

Defined in: packages/core/src/schema/document.ts:87

---

### PreviewData

> **PreviewData** = `Static`\<_typeof_ [`previewDataSchema`](#previewdataschema)\>

Defined in: packages/core/src/schema/document.ts:88

---

### Layout

> **Layout** = `Static`\<_typeof_ `layoutSchema`\>

Defined in: packages/core/src/schema/document.ts:89

---

### LayoutOverride

> **LayoutOverride** = `Static`\<_typeof_ `layoutOverrideSchema`\>

Defined in: packages/core/src/schema/document.ts:90

---

### AxisSize

> **AxisSize** = `Static`\<_typeof_ `axisSizeSchema`\>

Defined in: packages/core/src/schema/document.ts:91

---

### SizeValue

> **SizeValue** = `Static`\<_typeof_ `sizeValueSchema`\>

Defined in: packages/core/src/schema/document.ts:92

---

### Spacing

> **Spacing** = `Static`\<_typeof_ `spacingSchema`\>

Defined in: packages/core/src/schema/document.ts:93

---

### SpacingBox

> **SpacingBox** = `Static`\<_typeof_ `spacingBoxSchema`\>

Defined in: packages/core/src/schema/document.ts:94

---

### Margin

> **Margin** = `Static`\<_typeof_ `marginSchema`\>

Defined in: packages/core/src/schema/document.ts:95

---

### MarginBox

> **MarginBox** = `Static`\<_typeof_ `marginBoxSchema`\>

Defined in: packages/core/src/schema/document.ts:96

---

### StyleDeclarations

> **StyleDeclarations** = `Record`\<`string`, `string`\>

Defined in: packages/core/src/schema/document.ts:97

---

### StyleStates

> **StyleStates** = `Static`\<_typeof_ `styleStatesSchema`\>

Defined in: packages/core/src/schema/document.ts:98

---

### StyleLayer

> **StyleLayer** = `Static`\<_typeof_ `styleLayerSchema`\>

Defined in: packages/core/src/schema/document.ts:99

---

### StyleRule

> **StyleRule** = `Static`\<_typeof_ `styleRuleSchema`\>

Defined in: packages/core/src/schema/document.ts:100

---

### StyleBlock

> **StyleBlock** = `Static`\<_typeof_ `styleBlockSchema`\>

Defined in: packages/core/src/schema/document.ts:101

---

### TokenInterface

> **TokenInterface** = `Static`\<_typeof_ `tokenInterfaceSchema`\>

Defined in: packages/core/src/schema/document.ts:102

---

### FontStyle

> **FontStyle** = `Static`\<_typeof_ `fontStyleSchema`\>

Defined in: packages/core/src/schema/document.ts:105

---

### FontFaceFile

> **FontFaceFile** = `Static`\<_typeof_ `fontFaceFileSchema`\>

Defined in: packages/core/src/schema/document.ts:106

---

### FontSource

> **FontSource** = `Static`\<_typeof_ `fontSourceSchema`\>

Defined in: packages/core/src/schema/document.ts:107

---

### FontFamily

> **FontFamily** = [`FontFamilyDefinition`](#fontfamilydefinition)

Defined in: packages/core/src/schema/document.ts:108

---

### FontFamilyValue

> **FontFamilyValue** = `Static`\<_typeof_ `fontFamilySchema`\>

Defined in: packages/core/src/schema/document.ts:109

---

### Breakpoint

> **Breakpoint** = `Static`\<_typeof_ `breakpointSchema`\>

Defined in: packages/core/src/schema/document.ts:110

---

### FieldType

> **FieldType** = _typeof_ [`fieldTypes`](#fieldtypes)\[`number`\]

Defined in: packages/core/src/schema/fields.ts:20

---

### JsonSchemaField

> **JsonSchemaField** = [`FieldDefinition`](#fielddefinition) & `object`

Defined in: packages/core/src/schema/json-schema-fields.ts:3

#### Type Declaration

##### schema

> **schema**: [`JsonSchema`](#jsonschema)

---

### JsonValue

> **JsonValue** = `string` \| `number` \| `boolean` \| `null` \| [`JsonValue`](#jsonvalue)[] \| \{\[`key`: `string`\]: [`JsonValue`](#jsonvalue); \}

Defined in: packages/core/src/utils.ts:1

---

### DesignTokenUuid

> **DesignTokenUuid** = `Uuid`

Defined in: packages/domain/src/design-system.ts:4

Stable identity for one design token, independent of its editable label or group.

---

### BreakpointUuid

> **BreakpointUuid** = `Uuid`

Defined in: packages/domain/src/design-system.ts:5

---

### DesignTokenReference

> **DesignTokenReference** = `` `{token:${DesignTokenUuid}}` ``

Defined in: packages/domain/src/design-system.ts:8

Editor-internal reference syntax persisted in catalog node values.

---

### DesignTokenFamily

> **DesignTokenFamily** = `"color"` \| `"space"` \| `"radius"` \| `"shadow"` \| `"type"` \| `"font"`

Defined in: packages/domain/src/design-system.ts:14

---

### DesignTokenValueType

> **DesignTokenValueType** = `"color"` \| `"dimension"` \| `"number"` \| `"fontFamily"` \| `"fontWeight"` \| `"shadow"` \| `"typography"`

Defined in: packages/domain/src/design-system.ts:15

---

### DesignTokenValue

> **DesignTokenValue** = `string` \| `number` \| `boolean` \| `null` \| readonly [`DesignTokenValue`](#designtokenvalue)[] \| \{\[`key`: `string`\]: [`DesignTokenValue`](#designtokenvalue); \}

Defined in: packages/domain/src/design-system.ts:18

---

### DesignTokenFamilyMap

> **DesignTokenFamilyMap** = `Readonly`\<`Record`\<[`DesignTokenUuid`](#designtokenuuid), [`DesignTokenRecord`](#designtokenrecord)\>\>

Defined in: packages/domain/src/design-system.ts:78

---

### DesignTokenSet

> **DesignTokenSet** = `Readonly`\<\{ `color`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `space`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `radius`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `shadow`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `type`: [`DesignTokenFamilyMap`](#designtokenfamilymap); `font`: `Readonly`\<`Record`\<[`DesignTokenUuid`](#designtokenuuid), [`FontFamilyDefinition`](#fontfamilydefinition)\>\>; \}\>

Defined in: packages/domain/src/design-system.ts:79

---

### RenderBuildConfig

> **RenderBuildConfig** = [`ElementBuildConfig`](#elementbuildconfig) \| [`FragmentBuildConfig`](#fragmentbuildconfig)

Defined in: packages/domain/src/element-build.ts:59

---

### FieldValue

> **FieldValue** = `string` \| `number` \| `boolean` \| [`FieldValue`](#fieldvalue)[] \| \{\[`key`: `string`\]: [`FieldValue`](#fieldvalue); \}

Defined in: packages/domain/src/field-value.ts:1

---

### NodeDefinitionModel

> **NodeDefinitionModel** = `NodeDefinition`

Defined in: packages/domain/src/node.ts:186

## Variables

### DEFAULT\_HTML\_TAG\_OPTIONS

> `const` **DEFAULT\_HTML\_TAG\_OPTIONS**: readonly \[`"a"`, `"article"`, `"aside"`, `"button"`, `"div"`, `"footer"`, `"form"`, `"h1"`, `"h2"`, `"h3"`, `"h4"`, `"h5"`, `"h6"`, `"header"`, `"img"`, `"input"`, `"label"`, `"li"`, `"main"`, `"nav"`, `"ol"`, `"p"`, `"section"`, `"span"`, `"textarea"`, `"ul"`, `"video"`\]

Defined in: packages/core/src/document/html-tags.ts:2

Common HTML tag names for catalog node `dom.tagName` presets.

---

### VOID\_HTML\_TAGS

> `const` **VOID\_HTML\_TAGS**: readonly \[`"area"`, `"base"`, `"br"`, `"col"`, `"embed"`, `"hr"`, `"img"`, `"input"`, `"link"`, `"meta"`, `"param"`, `"source"`, `"track"`, `"wbr"`\]

Defined in: packages/core/src/document/html-tags.ts:35

HTML elements that cannot contain child nodes.

---

### ID\_PATTERN

> `const` **ID\_PATTERN**: `RegExp`

Defined in: packages/core/src/document/ids.ts:1

---

### TAG\_PATTERN

> `const` **TAG\_PATTERN**: `RegExp`

Defined in: packages/core/src/document/ids.ts:2

---

### nodeTypes

> `const` **nodeTypes**: readonly \[`"frame"`, `"text"`, `"image"`, `"instance"`, `"repeater"`, `"switch"`, `"slot"`\]

Defined in: packages/core/src/document/kinds.ts:1

---

### defaultKinds

> `const` **defaultKinds**: readonly \[`"atom"`, `"component"`, `"section"`, `"page"`\]

Defined in: packages/core/src/document/kinds.ts:13

Default document kinds. The list is data: pass a different rule map to replace it.

---

### defaultNestingRules

> `const` **defaultNestingRules**: `Record`\<[`DefaultKind`](#defaultkind), [`NestingRule`](#nestingrule)\>

Defined in: packages/core/src/document/kinds.ts:32

Atoms are single-element documents (one root node, no children). Anything with
more than one node belongs in a component or section. Components and sections
instance atoms from the library. A page canvas holds sections or components.

---

### childFieldPathSchema

> `const` **childFieldPathSchema**: `TString`

Defined in: packages/core/src/schema/common.ts:11

Slash-separated instance ids used for sparse overrides inside an instance.
Frame and root ids are intentionally omitted from these paths.

---

### defaultBreakpoints

> `const` **defaultBreakpoints**: [`Breakpoint`](#breakpoint)[]

Defined in: packages/core/src/schema/document.ts:113

Viewports used when a document does not set its own breakpoints.

---

### fieldTypes

> `const` **fieldTypes**: readonly \[`"text"`, `"richText"`, `"image"`, `"link"`, `"boolean"`, `"enum"`, `"number"`, `"token"`, `"array"`, `"object"`\]

Defined in: packages/core/src/schema/fields.ts:8

---

### previewDataSchema

> `const` **previewDataSchema**: `TObject`\<\{ `fields`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<[`FieldValue`](#fieldvalue)\>\>\>; `variants`: `TOptional`\<`TRecord`\<`TString`, `TRecord`\<`TString`, `TUnsafe`\<[`FieldValue`](#fieldvalue)\>\>\>\>; \}\>

Defined in: packages/core/src/schema/fonts.ts:68

Editor sample values. Never part of the component's runtime defaults.

---

### projectCatalogSchema

> `const` **projectCatalogSchema**: `TObject`\<\{ `atoms`: `TRecord`\<`TString`, `TObject`\<\{ `uuid`: `TString`; `name`: `TString`; `kind`: `TUnion`\<\[`TLiteral`\<`"atom"`\>, `TLiteral`\<`"component"`\>, `TLiteral`\<`"page"`\>\]\>; `category`: `TOptional`\<`TString`\>; `schema`: `TUnion`\<\[`TObject`\<\{ `kind`: `TLiteral`\<`"ref"`\>; `uuid`: `TString`; \}\>, `TObject`\<\{ `kind`: `TLiteral`\<`"inline"`\>; `schema`: `TRecord`\<`TString`, `TUnknown`\>; \}\>\]\>; `root`: `TRecursive`\<`TObject`\<\{ `uuid`: `TString`; `name`: `TOptional`\<`TString`\>; `dom`: `TObject`\<\{ `tagName`: `TOptional`\<...\>; `text`: `TOptional`\<...\>; `attributes`: `TOptional`\<...\>; `data`: `TOptional`\<...\>; `properties`: `TOptional`\<...\>; `event`: `TOptional`\<...\>; `children`: `TOptional`\<...\>; \}\>; `classes`: `TOptional`\<`TArray`\<`TObject`\<...\>\>\>; `schema`: `TOptional`\<`TUnion`\<\[..., ...\]\>\>; `data`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<...\>\>\>; `config`: `TOptional`\<`TObject`\<\{ `definitionRef`: ...; `definitionRefBinding`: ...; `composition`: ...; `compositionCase`: ...; `previewData`: ...; \}\>\>; \}\>\>; `behavior`: `TOptional`\<`TObject`\<\{ `state`: `TOptional`\<`TRecord`\<`TString`, `TUnknown`\>\>; `stateSchema`: `TOptional`\<`TRecord`\<`TString`, `TRecord`\<..., ...\>\>\>; `stateArrayKeyPaths`: `TOptional`\<`TRecord`\<`TString`, `TString`\>\>; `transitions`: `TArray`\<`TObject`\<\{ `nodeUuid`: ...; `event`: ...; `actions`: ...; \}\>\>; \}\>\>; `config`: `TOptional`\<`TObject`\<\{ `previewData`: `TOptional`\<`TObject`\<\{ `fields`: ...; \}\>\>; `fieldExposure`: `TOptional`\<`TRecord`\<`TString`, `TUnion`\<...\>\>\>; `staticFields`: `TOptional`\<`TRecord`\<`TString`, `TObject`\<...\>\>\>; `instanceFieldConfigs`: `TOptional`\<`TRecord`\<`TString`, `TRecord`\<..., ...\>\>\>; \}\>\>; \}\>\>; `components`: `TRecord`\<`TString`, `TObject`\<\{ `uuid`: `TString`; `name`: `TString`; `kind`: `TUnion`\<\[`TLiteral`\<`"atom"`\>, `TLiteral`\<`"component"`\>, `TLiteral`\<`"page"`\>\]\>; `category`: `TOptional`\<`TString`\>; `schema`: `TUnion`\<\[`TObject`\<\{ `kind`: `TLiteral`\<`"ref"`\>; `uuid`: `TString`; \}\>, `TObject`\<\{ `kind`: `TLiteral`\<`"inline"`\>; `schema`: `TRecord`\<`TString`, `TUnknown`\>; \}\>\]\>; `root`: `TRecursive`\<`TObject`\<\{ `uuid`: `TString`; `name`: `TOptional`\<`TString`\>; `dom`: `TObject`\<\{ `tagName`: `TOptional`\<...\>; `text`: `TOptional`\<...\>; `attributes`: `TOptional`\<...\>; `data`: `TOptional`\<...\>; `properties`: `TOptional`\<...\>; `event`: `TOptional`\<...\>; `children`: `TOptional`\<...\>; \}\>; `classes`: `TOptional`\<`TArray`\<`TObject`\<...\>\>\>; `schema`: `TOptional`\<`TUnion`\<\[..., ...\]\>\>; `data`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<...\>\>\>; `config`: `TOptional`\<`TObject`\<\{ `definitionRef`: ...; `definitionRefBinding`: ...; `composition`: ...; `compositionCase`: ...; `previewData`: ...; \}\>\>; \}\>\>; `behavior`: `TOptional`\<`TObject`\<\{ `state`: `TOptional`\<`TRecord`\<`TString`, `TUnknown`\>\>; `stateSchema`: `TOptional`\<`TRecord`\<`TString`, `TRecord`\<..., ...\>\>\>; `stateArrayKeyPaths`: `TOptional`\<`TRecord`\<`TString`, `TString`\>\>; `transitions`: `TArray`\<`TObject`\<\{ `nodeUuid`: ...; `event`: ...; `actions`: ...; \}\>\>; \}\>\>; `config`: `TOptional`\<`TObject`\<\{ `previewData`: `TOptional`\<`TObject`\<\{ `fields`: ...; \}\>\>; `fieldExposure`: `TOptional`\<`TRecord`\<`TString`, `TUnion`\<...\>\>\>; `staticFields`: `TOptional`\<`TRecord`\<`TString`, `TObject`\<...\>\>\>; `instanceFieldConfigs`: `TOptional`\<`TRecord`\<`TString`, `TRecord`\<..., ...\>\>\>; \}\>\>; \}\>\>; `pages`: `TRecord`\<`TString`, `TObject`\<\{ `uuid`: `TString`; `name`: `TString`; `kind`: `TUnion`\<\[`TLiteral`\<`"atom"`\>, `TLiteral`\<`"component"`\>, `TLiteral`\<`"page"`\>\]\>; `category`: `TOptional`\<`TString`\>; `schema`: `TUnion`\<\[`TObject`\<\{ `kind`: `TLiteral`\<`"ref"`\>; `uuid`: `TString`; \}\>, `TObject`\<\{ `kind`: `TLiteral`\<`"inline"`\>; `schema`: `TRecord`\<`TString`, `TUnknown`\>; \}\>\]\>; `root`: `TRecursive`\<`TObject`\<\{ `uuid`: `TString`; `name`: `TOptional`\<`TString`\>; `dom`: `TObject`\<\{ `tagName`: `TOptional`\<...\>; `text`: `TOptional`\<...\>; `attributes`: `TOptional`\<...\>; `data`: `TOptional`\<...\>; `properties`: `TOptional`\<...\>; `event`: `TOptional`\<...\>; `children`: `TOptional`\<...\>; \}\>; `classes`: `TOptional`\<`TArray`\<`TObject`\<...\>\>\>; `schema`: `TOptional`\<`TUnion`\<\[..., ...\]\>\>; `data`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<...\>\>\>; `config`: `TOptional`\<`TObject`\<\{ `definitionRef`: ...; `definitionRefBinding`: ...; `composition`: ...; `compositionCase`: ...; `previewData`: ...; \}\>\>; \}\>\>; `behavior`: `TOptional`\<`TObject`\<\{ `state`: `TOptional`\<`TRecord`\<`TString`, `TUnknown`\>\>; `stateSchema`: `TOptional`\<`TRecord`\<`TString`, `TRecord`\<..., ...\>\>\>; `stateArrayKeyPaths`: `TOptional`\<`TRecord`\<`TString`, `TString`\>\>; `transitions`: `TArray`\<`TObject`\<\{ `nodeUuid`: ...; `event`: ...; `actions`: ...; \}\>\>; \}\>\>; `config`: `TOptional`\<`TObject`\<\{ `previewData`: `TOptional`\<`TObject`\<\{ `fields`: ...; \}\>\>; `fieldExposure`: `TOptional`\<`TRecord`\<`TString`, `TUnion`\<...\>\>\>; `staticFields`: `TOptional`\<`TRecord`\<`TString`, `TObject`\<...\>\>\>; `instanceFieldConfigs`: `TOptional`\<`TRecord`\<`TString`, `TRecord`\<..., ...\>\>\>; \}\>\>; \}\>\>; `schemas`: `TOptional`\<`TRecord`\<`TString`, `TRecord`\<`TString`, `TUnknown`\>\>\>; `tokens`: `TOptional`\<`TObject`\<\{ `color`: `TRecord`\<`TString`, `TObject`\<\{ `uuid`: `TString`; `label`: `TString`; `group`: `TString`; `valueType`: `TUnion`\<`TLiteral`\<...\>[]\>; `value`: `TUnsafe`\<[`DesignTokenValue`](#designtokenvalue)\>; `breakpoints`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<...\>\>\>; `extensions`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<...\>\>\>; \}\>\>; `space`: `TRecord`\<`TString`, `TObject`\<\{ `uuid`: `TString`; `label`: `TString`; `group`: `TString`; `valueType`: `TUnion`\<`TLiteral`\<...\>[]\>; `value`: `TUnsafe`\<[`DesignTokenValue`](#designtokenvalue)\>; `breakpoints`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<...\>\>\>; `extensions`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<...\>\>\>; \}\>\>; `radius`: `TRecord`\<`TString`, `TObject`\<\{ `uuid`: `TString`; `label`: `TString`; `group`: `TString`; `valueType`: `TUnion`\<`TLiteral`\<...\>[]\>; `value`: `TUnsafe`\<[`DesignTokenValue`](#designtokenvalue)\>; `breakpoints`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<...\>\>\>; `extensions`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<...\>\>\>; \}\>\>; `shadow`: `TRecord`\<`TString`, `TObject`\<\{ `uuid`: `TString`; `label`: `TString`; `group`: `TString`; `valueType`: `TUnion`\<`TLiteral`\<...\>[]\>; `value`: `TUnsafe`\<[`DesignTokenValue`](#designtokenvalue)\>; `breakpoints`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<...\>\>\>; `extensions`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<...\>\>\>; \}\>\>; `type`: `TRecord`\<`TString`, `TObject`\<\{ `uuid`: `TString`; `label`: `TString`; `group`: `TString`; `valueType`: `TUnion`\<`TLiteral`\<...\>[]\>; `value`: `TUnsafe`\<[`DesignTokenValue`](#designtokenvalue)\>; `breakpoints`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<...\>\>\>; `extensions`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<...\>\>\>; \}\>\>; `font`: `TRecord`\<`TString`, `TObject`\<\{ `uuid`: `TString`; `label`: `TString`; `group`: `TString`; `valueType`: `TUnion`\<`TLiteral`\<...\>[]\>; `value`: `TUnsafe`\<[`DesignTokenValue`](#designtokenvalue)\>; `breakpoints`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<...\>\>\>; `extensions`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<...\>\>\>; \}\>\>; \}\>\>; `icons`: `TOptional`\<`TArray`\<`TObject`\<\{ `id`: `TString`; `name`: `TString`; `data`: `TObject`\<\{ `viewBox`: `TString`; `paths`: `TArray`\<`TString`\>; \}\>; `category`: `TOptional`\<`TString`\>; \}\>\>\>; `props`: `TOptional`\<`TRecord`\<`TString`, `TObject`\<\{ `uuid`: `TString`; `name`: `TString`; `value`: `TString`; \}\>\>\>; `globalStyles`: `TOptional`\<`TObject`\<\{ `block`: `TOptional`\<`TObject`\<\{ `declarations`: `TOptional`\<`TRecord`\<`TString`, `TString`\>\>; `states`: `TOptional`\<`TObject`\<\{ `hover`: ...; `focus-visible`: ...; `disabled`: ...; \}\>\>; `variants`: `TOptional`\<`TRecord`\<`TString`, `TRecord`\<..., ...\>\>\>; `breakpoints`: `TOptional`\<`TRecord`\<`TString`, `TObject`\<...\>\>\>; `rules`: `TOptional`\<`TArray`\<`TObject`\<...\>\>\>; \}\>\>; `tokenInterface`: `TOptional`\<`TObject`\<\{ `reads`: `TOptional`\<`TArray`\<`TString`\>\>; `sets`: `TOptional`\<`TRecord`\<`TString`, `TString`\>\>; \}\>\>; `breakpoints`: `TOptional`\<`TArray`\<`TObject`\<\{ `uuid`: `TString`; `label`: `TString`; `minWidth`: `TInteger`; `enabled`: `TOptional`\<`TBoolean`\>; \}\>\>\>; \}\>\>; \}\>

Defined in: packages/core/src/schema/node-model/catalog.ts:28

---

### nodeModelPreviewDataSchema

> `const` **nodeModelPreviewDataSchema**: `TObject`\<\{ `fields`: `TOptional`\<`TRecord`\<`TString`, `TUnknown`\>\>; \}\>

Defined in: packages/core/src/schema/node-model/config.ts:5

---

### nodeConfigSchema

> `const` **nodeConfigSchema**: `TObject`\<\{ `definitionRef`: `TOptional`\<`TString`\>; `definitionRefBinding`: `TOptional`\<`TObject`\<\{ `kind`: `TLiteral`\<`"item"`\>; `path`: `TString`; \}\>\>; `composition`: `TOptional`\<`TUnion`\<\[`TObject`\<\{ `kind`: `TLiteral`\<`"repeater"`\>; `keyPath`: `TOptional`\<`TString`\>; `indexName`: `TOptional`\<`TString`\>; `filter`: `TOptional`\<`TObject`\<\{ `kind`: `TLiteral`\<...\>; `itemPath`: `TString`; `queryState`: `TString`; \}\>\>; `source`: `TOptional`\<`TUnion`\<\[`TObject`\<...\>, `TObject`\<...\>, `TObject`\<...\>\]\>\>; \}\>, `TObject`\<\{ `kind`: `TLiteral`\<`"switch"`\>; `source`: `TOptional`\<`TUnion`\<\[`TObject`\<...\>, `TObject`\<...\>\]\>\>; \}\>, `TObject`\<\{ `kind`: `TLiteral`\<`"slot"`\>; \}\>\]\>\>; `compositionCase`: `TOptional`\<`TString`\>; `previewData`: `TOptional`\<`TObject`\<\{ `fields`: `TOptional`\<`TRecord`\<`TString`, `TUnknown`\>\>; \}\>\>; \}\>

Defined in: packages/core/src/schema/node-model/config.ts:30

---

### definitionConfigSchema

> `const` **definitionConfigSchema**: `TObject`\<\{ `previewData`: `TOptional`\<`TObject`\<\{ `fields`: `TOptional`\<`TRecord`\<`TString`, `TUnknown`\>\>; \}\>\>; `fieldExposure`: `TOptional`\<`TRecord`\<`TString`, `TUnion`\<\[`TObject`\<\{ `mode`: `TLiteral`\<`"flat"`\>; \}\>, `TObject`\<\{ `mode`: `TLiteral`\<`"grouped"`\>; `groupName`: `TOptional`\<`TString`\>; \}\>, `TObject`\<\{ `mode`: `TLiteral`\<`"manual"`\>; `fields`: `TRecord`\<`TString`, `TString`\>; \}\>\]\>\>\>; `staticFields`: `TOptional`\<`TRecord`\<`TString`, `TObject`\<\{ `isStatic`: `TLiteral`\<`true`\>; `value`: `TOptional`\<`TUnsafe`\<[`FieldValue`](#fieldvalue)\>\>; `expose`: `TOptional`\<`TBoolean`\>; \}\>\>\>; `instanceFieldConfigs`: `TOptional`\<`TRecord`\<`TString`, `TRecord`\<`TString`, `TObject`\<\{ `isStatic`: `TLiteral`\<`true`\>; `value`: `TOptional`\<`TUnsafe`\<[`FieldValue`](#fieldvalue)\>\>; `expose`: `TOptional`\<`TBoolean`\>; \}\>\>\>\>; \}\>

Defined in: packages/core/src/schema/node-model/config.ts:102

---

### domEventSchema

> `const` **domEventSchema**: `TRecord`\<`TString`, `TUnknown`\>

Defined in: packages/core/src/schema/node-model/dom.ts:4

---

### domSpecSchema

> `const` **domSpecSchema**: `TObject`\<\{ `tagName`: `TOptional`\<`TString`\>; `text`: `TOptional`\<`TString`\>; `attributes`: `TOptional`\<`TRecord`\<`TString`, `TString`\>\>; `data`: `TOptional`\<`TRecord`\<`TString`, `TString`\>\>; `properties`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<[`FieldValue`](#fieldvalue)\>\>\>; `event`: `TOptional`\<`TRecord`\<`TString`, `TUnknown`\>\>; \}\>

Defined in: packages/core/src/schema/node-model/dom.ts:17

---

### nodeDefinitionKindSchema

> `const` **nodeDefinitionKindSchema**: `TUnion`\<\[`TLiteral`\<`"atom"`\>, `TLiteral`\<`"component"`\>, `TLiteral`\<`"page"`\>\]\>

Defined in: packages/core/src/schema/node-model/node-definition.ts:126

---

### nodeDefinitionSchema

> `const` **nodeDefinitionSchema**: `TObject`\<\{ `uuid`: `TString`; `name`: `TString`; `kind`: `TUnion`\<\[`TLiteral`\<`"atom"`\>, `TLiteral`\<`"component"`\>, `TLiteral`\<`"page"`\>\]\>; `category`: `TOptional`\<`TString`\>; `schema`: `TUnion`\<\[`TObject`\<\{ `kind`: `TLiteral`\<`"ref"`\>; `uuid`: `TString`; \}\>, `TObject`\<\{ `kind`: `TLiteral`\<`"inline"`\>; `schema`: `TRecord`\<`TString`, `TUnknown`\>; \}\>\]\>; `root`: `TRecursive`\<`TObject`\<\{ `uuid`: `TString`; `name`: `TOptional`\<`TString`\>; `dom`: `TObject`\<\{ `tagName`: `TOptional`\<`TString`\>; `text`: `TOptional`\<`TString`\>; `attributes`: `TOptional`\<`TRecord`\<`TString`, `TString`\>\>; `data`: `TOptional`\<`TRecord`\<`TString`, `TString`\>\>; `properties`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<[`FieldValue`](#fieldvalue)\>\>\>; `event`: `TOptional`\<`TRecord`\<`TString`, `TUnknown`\>\>; `children`: `TOptional`\<`TArray`\<`TThis`\>\>; \}\>; `classes`: `TOptional`\<`TArray`\<`TObject`\<\{ `name`: `TString`; `generated`: `TOptional`\<`TLiteral`\<...\>\>; `condition`: `TOptional`\<`TUnion`\<...\>\>; `style`: `TOptional`\<`TObject`\<...\>\>; \}\>\>\>; `schema`: `TOptional`\<`TUnion`\<\[`TObject`\<\{ `kind`: `TLiteral`\<...\>; `uuid`: `TString`; \}\>, `TObject`\<\{ `kind`: `TLiteral`\<...\>; `schema`: `TRecord`\<..., ...\>; \}\>\]\>\>; `data`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<[`FieldValue`](#fieldvalue)\>\>\>; `config`: `TOptional`\<`TObject`\<\{ `definitionRef`: `TOptional`\<`TString`\>; `definitionRefBinding`: `TOptional`\<`TObject`\<\{ `kind`: ...; `path`: ...; \}\>\>; `composition`: `TOptional`\<`TUnion`\<\[..., ..., ...\]\>\>; `compositionCase`: `TOptional`\<`TString`\>; `previewData`: `TOptional`\<`TObject`\<\{ `fields`: ...; \}\>\>; \}\>\>; \}\>\>; `behavior`: `TOptional`\<`TObject`\<\{ `state`: `TOptional`\<`TRecord`\<`TString`, `TUnknown`\>\>; `stateSchema`: `TOptional`\<`TRecord`\<`TString`, `TRecord`\<`TString`, `TUnknown`\>\>\>; `stateArrayKeyPaths`: `TOptional`\<`TRecord`\<`TString`, `TString`\>\>; `transitions`: `TArray`\<`TObject`\<\{ `nodeUuid`: `TString`; `event`: `TString`; `actions`: `TArray`\<`TUnion`\<\[..., ..., ...\]\>\>; \}\>\>; \}\>\>; `config`: `TOptional`\<`TObject`\<\{ `previewData`: `TOptional`\<`TObject`\<\{ `fields`: `TOptional`\<`TRecord`\<`TString`, `TUnknown`\>\>; \}\>\>; `fieldExposure`: `TOptional`\<`TRecord`\<`TString`, `TUnion`\<\[`TObject`\<\{ `mode`: ...; \}\>, `TObject`\<\{ `mode`: ...; `groupName`: ...; \}\>, `TObject`\<\{ `mode`: ...; `fields`: ...; \}\>\]\>\>\>; `staticFields`: `TOptional`\<`TRecord`\<`TString`, `TObject`\<\{ `isStatic`: `TLiteral`\<`true`\>; `value`: `TOptional`\<`TUnsafe`\<...\>\>; `expose`: `TOptional`\<`TBoolean`\>; \}\>\>\>; `instanceFieldConfigs`: `TOptional`\<`TRecord`\<`TString`, `TRecord`\<`TString`, `TObject`\<\{ `isStatic`: `TLiteral`\<...\>; `value`: `TOptional`\<...\>; `expose`: `TOptional`\<...\>; \}\>\>\>\>; \}\>\>; \}\>

Defined in: packages/core/src/schema/node-model/node-definition.ts:132

---

### NODE\_MODEL\_SCHEMA\_ID

> `const` **NODE\_MODEL\_SCHEMA\_ID**: `"https://github.com/mmilad/facadeur/schema/node-model/node"` = `'https://github.com/mmilad/facadeur/schema/node-model/node'`

Defined in: packages/core/src/schema/node-model/node.ts:110

---

### nodeSchema

> `const` **nodeSchema**: `TRecursive`\<`TObject`\<\{ `uuid`: `TString`; `name`: `TOptional`\<`TString`\>; `dom`: `TObject`\<\{ `tagName`: `TOptional`\<`TString`\>; `text`: `TOptional`\<`TString`\>; `attributes`: `TOptional`\<`TRecord`\<`TString`, `TString`\>\>; `data`: `TOptional`\<`TRecord`\<`TString`, `TString`\>\>; `properties`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<[`FieldValue`](#fieldvalue)\>\>\>; `event`: `TOptional`\<`TRecord`\<`TString`, `TUnknown`\>\>; `children`: `TOptional`\<`TArray`\<`TThis`\>\>; \}\>; `classes`: `TOptional`\<`TArray`\<`TObject`\<\{ `name`: `TString`; `generated`: `TOptional`\<`TLiteral`\<`true`\>\>; `condition`: `TOptional`\<`TUnion`\<\[`TRecursive`\<...\>, `TObject`\<...\>\]\>\>; `style`: `TOptional`\<`TObject`\<\{ `declarations`: `TOptional`\<...\>; `states`: `TOptional`\<...\>; `variants`: `TOptional`\<...\>; `breakpoints`: `TOptional`\<...\>; \}\>\>; \}\>\>\>; `schema`: `TOptional`\<`TUnion`\<\[`TObject`\<\{ `kind`: `TLiteral`\<`"ref"`\>; `uuid`: `TString`; \}\>, `TObject`\<\{ `kind`: `TLiteral`\<`"inline"`\>; `schema`: `TRecord`\<`TString`, `TUnknown`\>; \}\>\]\>\>; `data`: `TOptional`\<`TRecord`\<`TString`, `TUnsafe`\<[`FieldValue`](#fieldvalue)\>\>\>; `config`: `TOptional`\<`TObject`\<\{ `definitionRef`: `TOptional`\<`TString`\>; `definitionRefBinding`: `TOptional`\<`TObject`\<\{ `kind`: `TLiteral`\<`"item"`\>; `path`: `TString`; \}\>\>; `composition`: `TOptional`\<`TUnion`\<\[`TObject`\<\{ `kind`: ...; `keyPath`: ...; `indexName`: ...; `filter`: ...; `source`: ...; \}\>, `TObject`\<\{ `kind`: ...; `source`: ...; \}\>, `TObject`\<\{ `kind`: ...; \}\>\]\>\>; `compositionCase`: `TOptional`\<`TString`\>; `previewData`: `TOptional`\<`TObject`\<\{ `fields`: `TOptional`\<`TRecord`\<..., ...\>\>; \}\>\>; \}\>\>; \}\>\>

Defined in: packages/core/src/schema/node-model/node.ts:112

---

### schemaSourceSchema

> `const` **schemaSourceSchema**: `TUnion`\<\[`TObject`\<\{ `kind`: `TLiteral`\<`"ref"`\>; `uuid`: `TString`; \}\>, `TObject`\<\{ `kind`: `TLiteral`\<`"inline"`\>; `schema`: `TRecord`\<`TString`, `TUnknown`\>; \}\>\]\>

Defined in: packages/core/src/schema/node-model/schema-source.ts:4

---

### uuidSchema

> `const` **uuidSchema**: `TString`

Defined in: packages/core/src/schema/node-model/uuid.ts:5

Stable registry id (rename-safe). Distinct from legacy document `id` slugs.

## Functions

### executeComponentBehavior()

> **executeComponentBehavior**(`behavior`, `nodeUuid`, `eventName`, `context`): [`BehaviorRuntimeResult`](#behaviorruntimeresult)

Defined in: packages/core/src/controller/project/behavior-runtime.ts:22

Execute the ordered, declarative transitions for one node event without mutating inputs.

#### Parameters

##### behavior

`ComponentBehavior` \| `undefined`

##### nodeUuid

`string`

##### eventName

`string`

##### context

[`BehaviorRuntimeContext`](#behaviorruntimecontext)

#### Returns

[`BehaviorRuntimeResult`](#behaviorruntimeresult)

---

### createCatalogDefinition()

> **createCatalogDefinition**(`catalog`, `kind`, `definition`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/definition-ops.ts:11

#### Parameters

##### catalog

`ProjectCatalog`

##### kind

`CatalogMapKey`

##### definition

`NodeDefinition`

#### Returns

`ProjectCatalog`

---

### patchCatalogDefinitionRecord()

> **patchCatalogDefinitionRecord**(`catalog`, `kind`, `uuid`, `patch`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/definition-ops.ts:24

#### Parameters

##### catalog

`ProjectCatalog`

##### kind

`CatalogMapKey`

##### uuid

`string`

##### patch

`Partial`\<`NodeDefinition`\>

#### Returns

`ProjectCatalog`

---

### deleteCatalogDefinitionRecord()

> **deleteCatalogDefinitionRecord**(`catalog`, `kind`, `uuid`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/definition-ops.ts:60

#### Parameters

##### catalog

`ProjectCatalog`

##### kind

`CatalogMapKey`

##### uuid

`string`

#### Returns

`ProjectCatalog`

---

### upsertCatalogSchema()

> **upsertCatalogSchema**(`catalog`, `uuid`, `schema`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/definition-ops.ts:86

#### Parameters

##### catalog

`ProjectCatalog`

##### uuid

`string`

##### schema

`JsonSchemaObject`

#### Returns

`ProjectCatalog`

---

### removeCatalogSchema()

> **removeCatalogSchema**(`catalog`, `uuid`): `ProjectCatalog`

Defined in: packages/core/src/controller/project/catalog/definition-ops.ts:101

#### Parameters

##### catalog

`ProjectCatalog`

##### uuid

`string`

#### Returns

`ProjectCatalog`

---

### catalogKindForDefinition()

> **catalogKindForDefinition**(`catalog`, `uuid`): `CatalogMapKey` \| `null`

Defined in: packages/core/src/controller/project/catalog/definition-ops.ts:117

#### Parameters

##### catalog

`ProjectCatalog`

##### uuid

`string`

#### Returns

`CatalogMapKey` \| `null`

---

### componentPropsForSchema()

> **componentPropsForSchema**(`schema`): `object`[]

Defined in: packages/core/src/controller/project/catalog/field-ids.ts:220

Project a component schema into its bindable property fields.

#### Parameters

##### schema

`unknown`

#### Returns

`object`[]

---

### layerSelectorForName()

> **layerSelectorForName**(`name`): `string`

Defined in: packages/core/src/controller/project/catalog/node-classes.ts:3

#### Parameters

##### name

`string`

#### Returns

`string`

---

### classListFromNode()

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

### projectStyleSuggestions()

> **projectStyleSuggestions**(`catalog`): `object`

Defined in: packages/core/src/queries.ts:21

Compose Catalog style declarations and token choices for Editor read consumers.

#### Parameters

##### catalog

`ProjectCatalog`

#### Returns

`object`

##### keys

> **keys**: `string`[]

##### valuesByKey

> **valuesByKey**: `object`

###### Index Signature

\[`k`: `string`\]: `string`[]

##### options

> **options**: `object`[] = `tokenOptions`

---

### tokenByUuid()

> **tokenByUuid**(`catalog`, `uuid`): [`IndexedToken`](#indexedtoken) \| `undefined`

Defined in: packages/core/src/queries.ts:71

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

Defined in: packages/core/src/queries.ts:76

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

Defined in: packages/core/src/queries.ts:81

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
